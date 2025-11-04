from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from datetime import datetime, timezone, timedelta
from langchain.chat_models import init_chat_model
from .state import AgentState
from .tools import create_event, get_events, delete_event,google_cal

from dotenv import load_dotenv

load_dotenv()


tools = [create_event, get_events, delete_event]
llm = init_chat_model("groq:openai/gpt-oss-20b").bind_tools(
    tools
)


MAIN_SYSTEM_PROMPT = """
The current time is {current_time}.
You are an assistant that manages reminders and time-blocking events in Google Calendar. Be precise and follow rules exactly.

Goals:
- If user gives a reminder WITHOUT a specific time → ask for the time (do NOT call the calendar).
- If user requests a time-blocking plan and does NOT specify a duration → ask for duration; if user still doesn’t know, default to 30 days.
- When calling calendar tools, always use ISO datetimes with timezone +05:30.

Tool usage guidance (exact accepted `get_events()` formats):
- get_events()        → default next 10 days
- get_events("Nd")    → next N days (e.g., "30d")
- get_events("Nm")    → next N months (e.g., "6m")
- get_events("YYYY-MM-DD") → until that date

Output rules:
- Be explicit, minimal, and actionable.
- When you plan, collect all missing info first before creating events.
- When user confirms a plan with “okay”, “yes”, “go ahead” (or equivalents) do the tool call
"""

CLASSIFY_PROMPT = """
Classify the user's prompt as exactly ONE of: planner OR reminder OR delete.
Rules:
- Return ONLY the single word: planner OR reminder OR delete. No punctuation, no explanation.
- Use planner for multi-day plans, study/project schedules, or when the user asks to create multi-step plans.
- Use reminder for single events or repeating single-slot events (birthdays, single meeting, daily workout).
- Use delete when the user asks to delete/modify multi-step plans.
- Use get_events when user suggest to retrive the events
Examples:
- "Study schedule for 6 months before exams" → planner
- "Remind me to call mom every Sunday" → reminder
- "Delete my study sessions" → delete
- "Get all the events" → get_event
"""

GET_EVENTS_EXTRACTOR_PROMPT = """
Your ONLY job: output exactly ONE token (no quotes, no text) matching one of:
- Nd  (e.g., 30d)
- Nm  (e.g., 6m)
- YYYY-MM-DD

Rules (map natural language → output):
- "next week" → 7d; "next 2 weeks" → 14d
- "this week" → 7d; "this month" → 30d
- "next N months" → Nm
- "until/till/by/on <date>" → YYYY-MM-DD (use ISO date)
- If no period/date found → 10d
Ignore unrelated numbers (times, versions). Output exactly one token only.

Examples:
- "show events next 6 months" → 6m
- "events till 2025-12-31" → 2025-12-31
"""

PLANNER_PROMPT = """
Context: {events}

Role: You are a planner that builds multi-day time-blocked schedules before deadlines.

Procedure (strict):
1. Extract goal, deadline, and milestones from the user text.
2. If missing: ask for available hours/day, topics/milestones, and hard deadlines — do not proceed until you have them.
3. Inspect {events} to find free, non-overlapping slots before the deadline.
4. Propose a balanced plan (daily or weekly) listing each session: topic → date → start_time → end_time (ISO +05:30).
5. Do NOT create calendar events yet. Present the plan and any tradeoffs.

Confirmation rule:
- When user explicitly confirms (e.g., "yes", "okay", "go ahead with this plan"), reply exactly: CONFIRM
"""

EVENT_CREATION_PROMPT = """
Role: Event creator. Input = confirmed schedule from planner.

For each session produce a dict:
{
 "summary": "<short title>",
 "description": "<goal or brief note>",
 "start": {"dateTime": "<ISO datetime with +05:30>"},
 "end":   {"dateTime": "<ISO datetime with +05:30>"}
}

If multiple sessions -> build events_list (list of dicts) and call create_event(events_list=events_list).
If only one session -> call create_event(summary=..., description=..., strt_dateTime=..., end_dateTime=...).

Constraints:
- All datetimes must be ISO and include +05:30 timezone.
- Do not modify existing events; skip conflicting slots and report skipped items.
- Return the tool's output as-is.
"""

DELETE_PROMPT = """
Role: Event deleter. Input = user request to delete events.
All Events: {events}

1.  Identify the events the user wants to delete from the context.
2.  Extract the event IDs of the events to be deleted from All Events.
3.  If you are unsure which events to delete, ask for clarification.
4.  Before deleting, ask for confirmation from the user.
5.  call the delete_event node
6.  When user explicitly confirms (e.g., "yes", "okay", "go ahead with this plan"), call the `delete_event` tool for each `event_id`.
"""


def get_current_time(state: AgentState) -> AgentState:
    ist = timezone(timedelta(hours=5, minutes=30))
    state["current_time"] = datetime.now(ist).isoformat()
    return state


def human_feedback(state: AgentState):
    pass


def should_continue(state: AgentState):
    if state["messages"][-1].tool_calls or state["messages"][-1].content == "CONFIRM":
        return "tool"
    return "human_feedback"

def model(state: AgentState):
    """Enhanced model with memory context"""
    
    # Get memory from state
    preferences = state.get("relevant_preferences", [])
    similar_convos = state.get("similar_conversations", [])
    patterns = state.get("scheduling_patterns", [])
    
    # Build memory context
    memory_context = "\n\n=== RELEVANT USER CONTEXT ===\n"
    
    if preferences:
        memory_context += "\nUSER PREFERENCES:\n"
        for pref in preferences[:3]:
            memory_context += f"- {pref['text']}\n"
    
    if similar_convos:
        memory_context += "\nSIMILAR PAST CONVERSATIONS:\n"
        for conv in similar_convos[:2]:
            memory_context += f"- User asked: {conv['user_message'][:60]}...\n"
    
    if patterns:
        memory_context += "\nSCHEDULING PATTERNS:\n"
        for pattern in patterns[:3]:
            memory_context += f"- {pattern['description']}\n"
    
    # Enhanced system prompt
    enhanced_prompt = MAIN_SYSTEM_PROMPT.format(
        current_time=state["current_time"]
    ) + memory_context
    
    messages = [SystemMessage(content=enhanced_prompt)] + state["messages"]
    response = llm.invoke(messages)
    
    return {"messages": [response]}


def classify_model(state: AgentState) -> AgentState:
    sys_mess = SystemMessage(content=CLASSIFY_PROMPT)
    # Expect exactly "planner" or "reminder" or "delete"
    state["task_type"] = llm.invoke([sys_mess] + state["messages"]).content.strip()
    return state


def route_classifier(state: AgentState):
    if state.get("task_type", "") == "planner":
        return "planner"
    elif state.get("task_type", "") == "delete":
        return "delete"
    elif state.get("task_type","")== "get_event":
        return "get_event"
    else:
        return "reminder"


### scheduler ###


def get_events_node(state: AgentState):
    sys_mess = SystemMessage(content=GET_EVENTS_EXTRACTOR_PROMPT)
    period = llm.invoke([sys_mess] + state["messages"]).content.strip()
    # Fallback safety
    if not period:
        period = "10d"
    events = google_cal.get_events(period)
    state["tasks"] = events
    return state


def model_schedule(state: AgentState) -> AgentState:
    sys_mess = SystemMessage(content=PLANNER_PROMPT.format(events=state.get("tasks", [])))
    state["messages"] = llm.invoke([sys_mess] + state["messages"])
    return state


def model_add(state: AgentState) -> AgentState:
    sys_mess = SystemMessage(content=EVENT_CREATION_PROMPT)
    state["messages"] = llm.invoke([sys_mess] + state["messages"])
    return state

def model_delete(state: AgentState) -> AgentState:
    sys_mess = SystemMessage(content=DELETE_PROMPT.format(events=state.get("tasks", [])))
    state["messages"] = llm.invoke([sys_mess] + state["messages"])
    return state