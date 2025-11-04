# utils/memory_nodes.py - Memory retrieval and storage nodes with lazy init

from utils.state import AgentState
from langchain_core.messages import HumanMessage, AIMessage
import traceback

# Lazy initialization - don't create connection until first use
_memory_store = None

def get_memory_store():
    """Lazy initialization of memory store"""
    global _memory_store
    if _memory_store is None:
        try:
            from utils.weaviate_memory import WeaviateMemoryStore
            _memory_store = WeaviateMemoryStore()
            print("✓ Memory store initialized")
        except Exception as e:
            print(f"✗ Memory store initialization failed: {e}")
            _memory_store = False  # Mark as failed to avoid retrying
    return _memory_store if _memory_store is not False else None

# Expose for cleanup
@property
def memory_store():
    return get_memory_store()


def retrieve_semantic_memory(state: AgentState) -> AgentState:
    """Retrieve relevant memories from Weaviate before processing"""
    
    store = get_memory_store()
    if store is None:
        print("⚠ Memory store not available, skipping retrieval")
        return state
    
    user_id = state.get("user_id", "default_user")
    messages = state["messages"]
    
    # Build query from recent user messages
    recent_context = ""
    for msg in reversed(messages[-3:]):
        if isinstance(msg, HumanMessage) and hasattr(msg, 'content'):
            recent_context = msg.content + " " + recent_context
    
    recent_context = recent_context.strip()
    
    if not recent_context:
        return state
    
    try:
        preferences = store.get_relevant_preferences(
            user_id=user_id,
            query=recent_context,
            limit=3
        )
        
        similar_convos = store.retrieve_similar_conversations(
            user_id=user_id,
            current_context=recent_context,
            limit=2
        )
        
        patterns = store.find_similar_patterns(
            user_id=user_id,
            task_description=recent_context,
            limit=3
        )
        
        print(f"✓ Retrieved: {len(preferences)} prefs, {len(similar_convos)} convos, {len(patterns)} patterns")
        
        return {
            **state,
            "relevant_preferences": preferences,
            "similar_conversations": similar_convos,
            "scheduling_patterns": patterns
        }
    
    except Exception as e:
        print(f"⚠ Memory retrieval error: {e}")
        return state


def store_interaction_memory(state: AgentState) -> AgentState:
    """Store completed interaction in Weaviate for future learning"""
    
    store = get_memory_store()
    if store is None:
        return state
    
    user_id = state.get("user_id", "default_user")
    thread_id = state.get("thread_id", "default_thread")
    messages = state["messages"]
    
    try:
        # Find last user and assistant messages
        user_msg = None
        assistant_msg = None
        
        for msg in reversed(messages):
            if isinstance(msg, HumanMessage) and user_msg is None:
                user_msg = msg.content
            elif isinstance(msg, AIMessage) and assistant_msg is None:
                assistant_msg = msg.content
            
            if user_msg and assistant_msg:
                break
        
        if user_msg and assistant_msg:
            store.store_conversation_turn(
                user_id=user_id,
                thread_id=thread_id,
                user_message=user_msg,
                assistant_response=assistant_msg,
                task_type=state.get("task_type", "unknown"),
                successful=True
            )
            
            tasks = state.get("tasks", [])
            if tasks:
                for task in tasks:
                    # FIXED: Safe extraction with type checking
                    summary = task.get('summary', 'Untitled Task')
                    start_time = task.get('start', '')
                    
                    # Handle different start time formats
                    if isinstance(start_time, dict):
                        start_time = start_time.get('dateTime', '')
                    start_time_str = str(start_time) if start_time else 'unspecified time'
                    
                    pattern_desc = f"User scheduled '{summary}' at {start_time_str}"
                    
                    store.store_scheduling_pattern(
                        user_id=user_id,
                        pattern_description=pattern_desc,
                        task_type=state.get("task_type", "unknown"),
                        task_data=task
                    )
                
                print(f"✓ Stored {len(tasks)} scheduling patterns")
        
        return state
    
    except Exception as e:
        print(f"⚠ Memory storage error: {e}")
        import traceback
        traceback.print_exc()
        return state



# Expose memory store for cleanup in main.py
def get_memory_store_for_cleanup():
    """Get memory store instance for cleanup"""
    return _memory_store if isinstance(_memory_store, object) else None
