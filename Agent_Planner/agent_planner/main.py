import gradio as gr
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from agent import app
import uuid
import signal
import sys
import atexit

# Import for cleanup
from utils.memory_node import get_memory_store_for_cleanup

def get_user_session(user_id: str = None):
    """Generate or retrieve user session"""
    if user_id is None:
        user_id = str(uuid.uuid4())[:8]
    return {"configurable": {"thread_id": user_id}}, user_id

def chat_with_agent(user_input, history, session_state=None):
    """Enhanced chat function with memory tracking"""
    
    # Initialize or retrieve session
    if session_state is None:
        thread, user_id = get_user_session()
        session_state = {"thread": thread, "user_id": user_id}
    else:
        thread = session_state["thread"]
        user_id = session_state["user_id"]
    
    # Add user message to history
    history = history + [(user_input, None)]
    
    # Create initial input with user context
    initial_input = {
        "messages": [HumanMessage(content=user_input)],
        "user_id": user_id,
        "thread_id": user_id
    }
    
    final_output = ""
    event_data = None
    
    try:
        # Stream agent execution
        for event in app.stream(initial_input, thread, stream_mode="values"):
            msg = event["messages"][-1]
            if isinstance(msg, AIMessage):
                final_output = msg.content
                event_data = event
        
        # print(event_data["messages"][-1])
        # Handle different task types
        if (
            event_data and
            isinstance(event_data["messages"][-1], AIMessage)
            and len(event_data["messages"]) >= 2
            and not isinstance(event_data["messages"][-2], ToolMessage)
            and event_data.get("task_type") == "reminder"
        ):
            bot_reply = final_output
            history[-1] = (user_input, bot_reply)
            return history, history, session_state
        
        elif (
            event_data and
            isinstance(event_data["messages"][-1], AIMessage)
            and len(event_data["messages"]) >= 2
            and not isinstance(event_data["messages"][-2], ToolMessage)
            and event_data.get("task_type") == "planner"
        ):
            bot_reply = final_output
            history[-1] = (user_input, bot_reply)
            return history, history, session_state
        
        else:
            history[-1] = (user_input, final_output)
            return history, history, session_state
    
    except Exception as e:
        error_msg = f"❌ Error: {str(e)}"
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        history[-1] = (user_input, error_msg)
        return history, history, session_state


# ============ CLEANUP HANDLERS ============

def cleanup_resources():
    """Clean up Weaviate connection and other resources"""
    print("\n🧹 Cleaning up resources...")
    try:
        store = get_memory_store_for_cleanup()
        if store is not None:
            store.close()
            print("✓ Weaviate connection closed")
    except Exception as e:
        print(f"⚠ Cleanup warning: {e}")

def signal_handler(sig, frame):
    """Handle Ctrl+C and other termination signals"""
    print("\n\n⚠ Shutdown signal received...")
    cleanup_resources()
    sys.exit(0)

# Register cleanup handlers
atexit.register(cleanup_resources)
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ============ GRADIO INTERFACE ============

with gr.Blocks() as demo:
    gr.Markdown("# 🤖 AI Agent Planner with Memory")
    gr.Markdown("Your intelligent scheduling assistant with semantic memory")
    
    # FIXED: Remove type='messages' to use default tuple format
    chatbot = gr.Chatbot(label="Conversation")
    
    msg = gr.Textbox(
        label="Your message",
        placeholder="Schedule a meeting tomorrow at 10 AM"
    )
    session_state = gr.State()
    
    msg.submit(
        chat_with_agent,
        [msg, chatbot, session_state],
        [chatbot, chatbot, session_state]
    )
    
    clear = gr.Button("Clear Conversation")
    clear.click(lambda: ([], None), None, [chatbot, session_state])
    
    gr.Examples(
        examples=[
            "Schedule a team meeting tomorrow at 10 AM",
            "Plan my day with 3 hours of focused work",
            "What events do I have this week?",
            "Delete my meeting on Monday"
        ],
        inputs=msg
    )

if __name__ == "__main__":
    try:
        print("🚀 Starting AI Agent Planner...")
        demo.launch()
    except KeyboardInterrupt:
        print("\n⚠ Keyboard interrupt detected")
    finally:
        cleanup_resources()
