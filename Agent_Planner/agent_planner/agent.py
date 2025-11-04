# %%
# agent.py - Fixed flow for get_event routing

from utils.nodes import (
    model,
    human_feedback,
    should_continue,
    get_current_time,
    classify_model,
    route_classifier,
    get_events_node,
    model_schedule,
    model_add,
    model_delete,
)

from utils.state import AgentState
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from utils import tools
from langgraph.checkpoint.memory import MemorySaver
from utils.memory_node import retrieve_semantic_memory, store_interaction_memory

# Initialize
agent = StateGraph(AgentState)
tool_node = ToolNode(tools)

# ============ ADD ALL NODES ============
agent.add_node("retrieve_memory", retrieve_semantic_memory)
agent.add_node("store_memory", store_interaction_memory)
agent.add_node("current_time", get_current_time)
agent.add_node("get_event", get_events_node)
agent.add_node("classify_model", classify_model)
agent.add_node("model", model)
agent.add_node("refine_model", model)
agent.add_node("scheduler", model_schedule)
agent.add_node("model_add", model_add)
agent.add_node("model_delete", model_delete)
agent.add_node("tool", tool_node)
agent.add_node("human_feedback_reminder", human_feedback)
agent.add_node("human_feedback_planner", human_feedback)
agent.add_node("human_feedback_delete", human_feedback)

# ============ DEFINE FLOW ============
agent.set_entry_point("retrieve_memory")
agent.add_edge("retrieve_memory", "current_time")
agent.add_edge("current_time", "get_event")
agent.add_edge("get_event", "classify_model")

# FIXED: Route get_event to model (which will call tool), not directly to refine_model
agent.add_conditional_edges(
    "classify_model",
    route_classifier,
    {
        "planner": "scheduler",
        "reminder": "model",
        "delete": "model_delete",
        "get_event": "model"  # CHANGED: Route to model instead of refine_model
    }
)

# ============ REMINDER & GET_EVENT FLOW ============
agent.add_conditional_edges(
    "model",
    should_continue,
    {
        "tool": "tool",
        "human_feedback": "human_feedback_reminder"
    },
)
agent.add_edge("human_feedback_reminder", "model")

# ============ PLANNER FLOW ============
agent.add_conditional_edges(
    "scheduler",
    should_continue,
    {
        "tool": "model_add",
        "human_feedback": "human_feedback_planner"
    },
)
agent.add_edge("human_feedback_planner", "scheduler")
agent.add_edge("model_add", "tool")

# ============ DELETE FLOW ============
agent.add_conditional_edges(
    "model_delete",
    should_continue,
    {
        "tool": "tool",
        "human_feedback": "human_feedback_delete"
    },
)
agent.add_edge("human_feedback_delete", "model_delete")

# ============ FINAL FLOW TO END ============
agent.add_edge("tool", "refine_model")
agent.add_edge("refine_model", "store_memory")
agent.add_edge("store_memory", END)

# ============ COMPILE ============
checkpointer = MemorySaver()
app = agent.compile(
    checkpointer=checkpointer,
    interrupt_before=[
        "human_feedback_reminder",
        "human_feedback_planner",
        "human_feedback_delete"
    ]
)

# from IPython.display import Image, display

# display(Image(app.get_graph().draw_mermaid_png()))
# %%
if "__main__" == __name__:
    thread = {"configurable": {"thread_id": "1"}}
    input_ = input("Enter prompt:")

    initial_input = {"messages": [HumanMessage(content=input_)]}
    
    for event in app.stream(initial_input, thread, stream_mode="values"):
        event["messages"][-1].pretty_print()
    

    while (
        isinstance(event["messages"][-1], AIMessage)
        and not isinstance(event["messages"][-2], ToolMessage)
        and event.get("task_type") == "reminder"
    ):
        user_input = input("tell the time:")
        app.update_state(
            thread, {"messages": user_input}, as_node="human_feedback_reminder"
        )
        for event in app.stream(None, thread, stream_mode="values"):
            event["messages"][-1].pretty_print()

    while (
        isinstance(event["messages"][-1], AIMessage)
        and not isinstance(event["messages"][-2], ToolMessage)
        and event.get("task_type") == "planner"
    ):
        user_input = input("user:")
        app.update_state(thread, {"messages": user_input}, as_node="human_feedback_planner")
        for event in app.stream(None, thread, stream_mode="values"):
            event["messages"][-1].pretty_print()
            
    while (
        isinstance(event["messages"][-1], AIMessage)
        and not isinstance(event["messages"][-2], ToolMessage)
        and event.get("task_type") == "delete"
    ):
        user_input = input("user:")
        app.update_state(thread, {"messages": user_input}, as_node="human_feedback_delete")
        for event in app.stream(None, thread, stream_mode="values"):
            event["messages"][-1].pretty_print()


    print("done")
