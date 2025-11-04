import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import Filter
from datetime import datetime, timezone
import json
import os
from dotenv import load_dotenv

load_dotenv()

class WeaviateMemoryStore:
    def __init__(self):
        """Initialize Weaviate Cloud connection with free Cohere embeddings"""
        
        try:
            # Connect to Weaviate Cloud
            self.client = weaviate.connect_to_weaviate_cloud(
                cluster_url=os.getenv("WEAVIATE_URL"),
                auth_credentials=Auth.api_key(os.getenv("WEAVIATE_API_KEY")),
                headers={
                    "X-Cohere-Api-Key": os.getenv("COHERE_API_KEY")
                }
            )
            
            print(f"✓ Connected to Weaviate Cloud: {self.client.is_ready()}")
            self._create_collections()
        except Exception as e:
            print(f"✗ Failed to connect to Weaviate: {e}")
            raise
    
    def _get_rfc3339_timestamp(self):
        """Generate RFC 3339 compliant timestamp with timezone"""
        return datetime.now(timezone.utc).isoformat()
    
    def _create_collections(self):
        """Create collections with free Cohere embeddings"""
        
        # Get existing collections - list_all() returns dict in v4
        try:
            existing = self.client.collections.list_all(simple=True)
            existing_names = list(existing.keys()) if isinstance(existing, dict) else []
            print(f"Existing collections: {existing_names}")
        except Exception as e:
            print(f"Error listing collections: {e}")
            existing_names = []
        
        # 1. User Preferences Collection
        if "UserPreference" not in existing_names:
            try:
                self.client.collections.create(
                    name="UserPreference",
                    description="User scheduling preferences and patterns",
                    vectorizer_config=Configure.Vectorizer.text2vec_cohere(
                        model="embed-english-v3.0",
                    ),
                    properties=[
                        Property(name="userId", data_type=DataType.TEXT),
                        Property(name="preferenceText", data_type=DataType.TEXT),
                        Property(name="preferenceType", data_type=DataType.TEXT),
                        Property(name="preferenceData", data_type=DataType.TEXT),
                        Property(name="timestamp", data_type=DataType.DATE),
                    ]
                )
                print("✓ Created UserPreference collection")
            except Exception as e:
                print(f"UserPreference collection error: {e}")
        else:
            print("✓ UserPreference collection already exists")
        
        # 2. Conversation Memory Collection
        if "ConversationMemory" not in existing_names:
            try:
                self.client.collections.create(
                    name="ConversationMemory",
                    description="Semantic conversation history",
                    vectorizer_config=Configure.Vectorizer.text2vec_cohere(
                        model="embed-english-v3.0",
                    ),
                    properties=[
                        Property(name="userId", data_type=DataType.TEXT),
                        Property(name="threadId", data_type=DataType.TEXT),
                        Property(name="conversationText", data_type=DataType.TEXT),
                        Property(name="userMessage", data_type=DataType.TEXT),
                        Property(name="assistantMessage", data_type=DataType.TEXT),
                        Property(name="taskType", data_type=DataType.TEXT),
                        Property(name="successful", data_type=DataType.BOOL),
                        Property(name="timestamp", data_type=DataType.DATE),
                    ]
                )
                print("✓ Created ConversationMemory collection")
            except Exception as e:
                print(f"ConversationMemory collection error: {e}")
        else:
            print("✓ ConversationMemory collection already exists")
        
        # 3. Scheduling Patterns Collection
        if "SchedulingPattern" not in existing_names:
            try:
                self.client.collections.create(
                    name="SchedulingPattern",
                    description="Learned scheduling patterns",
                    vectorizer_config=Configure.Vectorizer.text2vec_cohere(
                        model="embed-english-v3.0",
                    ),
                    properties=[
                        Property(name="userId", data_type=DataType.TEXT),
                        Property(name="patternDescription", data_type=DataType.TEXT),
                        Property(name="taskType", data_type=DataType.TEXT),
                        Property(name="taskSummary", data_type=DataType.TEXT),
                        Property(name="preferredTime", data_type=DataType.TEXT),
                        Property(name="duration", data_type=DataType.INT),
                        Property(name="dayPattern", data_type=DataType.TEXT),
                        Property(name="frequency", data_type=DataType.INT),
                        Property(name="timestamp", data_type=DataType.DATE),
                    ]
                )
                print("✓ Created SchedulingPattern collection")
            except Exception as e:
                print(f"SchedulingPattern collection error: {e}")
        else:
            print("✓ SchedulingPattern collection already exists")
    
    def store_user_preference(self, user_id: str, preference_text: str, 
                             preference_type: str, preference_data: dict):
        """Store user preference with automatic embedding"""
        
        collection = self.client.collections.get("UserPreference")
        
        data_object = {
            "userId": user_id,
            "preferenceText": preference_text,
            "preferenceType": preference_type,
            "preferenceData": json.dumps(preference_data),
            "timestamp": self._get_rfc3339_timestamp()
        }
        
        uuid = collection.data.insert(data_object)
        print(f"✓ Stored preference: {preference_type} (UUID: {uuid})")
        return uuid
    
    def get_relevant_preferences(self, user_id: str, query: str, limit: int = 5):
        """Retrieve semantically similar preferences"""
        
        collection = self.client.collections.get("UserPreference")
        
        response = collection.query.near_text(
            query=query,
            limit=limit,
            filters=Filter.by_property("userId").equal(user_id)
        )
        
        results = []
        for obj in response.objects:
            results.append({
                "text": obj.properties["preferenceText"],
                "type": obj.properties["preferenceType"],
                "data": json.loads(obj.properties["preferenceData"]),
                "timestamp": obj.properties["timestamp"]
            })
        
        return results
    
    def store_conversation_turn(self, user_id: str, thread_id: str,
                                user_message: str, assistant_response: str,
                                task_type: str, successful: bool = True):
        """Store conversation with semantic embedding"""
        
        collection = self.client.collections.get("ConversationMemory")
        
        conversation_text = f"""
        User asked: {user_message}
        Assistant responded: {assistant_response}
        Task was: {task_type}
        """
        
        data_object = {
            "userId": user_id,
            "threadId": thread_id,
            "conversationText": conversation_text.strip(),
            "userMessage": user_message,
            "assistantMessage": assistant_response,
            "taskType": task_type,
            "successful": successful,
            "timestamp": self._get_rfc3339_timestamp()
        }
        
        uuid = collection.data.insert(data_object)
        print(f"✓ Stored conversation (UUID: {uuid})")
        return uuid
    
    def retrieve_similar_conversations(self, user_id: str, current_context: str, 
                                      limit: int = 3):
        """Find semantically similar past conversations"""
        
        collection = self.client.collections.get("ConversationMemory")
        
        response = collection.query.near_text(
            query=current_context,
            limit=limit,
            filters=Filter.by_property("userId").equal(user_id)
        )
        
        results = []
        for obj in response.objects:
            results.append({
                "user_message": obj.properties["userMessage"],
                "assistant_message": obj.properties["assistantMessage"],
                "task_type": obj.properties["taskType"],
                "timestamp": obj.properties["timestamp"]
            })
        
        return results
    
    def store_scheduling_pattern(self, user_id: str, pattern_description: str,
                            task_type: str, task_data: dict):
        """Store scheduling pattern with embedding"""
        
        collection = self.client.collections.get("SchedulingPattern")
        
        # FIXED: Convert all fields to strings explicitly
        preferred_time = task_data.get("start", "")
        if isinstance(preferred_time, dict):
            # If it's a dict (like {'dateTime': '...', 'timeZone': '...'}), extract the datetime
            preferred_time = preferred_time.get("dateTime", str(preferred_time))
        preferred_time = str(preferred_time) if preferred_time else ""
        
        task_summary = task_data.get("summary", "")
        task_summary = str(task_summary) if task_summary else ""
        
        day_pattern = task_data.get("day_pattern", "weekday")
        day_pattern = str(day_pattern) if day_pattern else "weekday"
        
        duration = task_data.get("duration", 60)
        try:
            duration = int(duration)
        except (ValueError, TypeError):
            duration = 60
        
        data_object = {
            "userId": user_id,
            "patternDescription": pattern_description,
            "taskType": task_type,
            "taskSummary": task_summary,
            "preferredTime": preferred_time,  # Now guaranteed to be string
            "duration": duration,              # Now guaranteed to be int
            "dayPattern": day_pattern,         # Now guaranteed to be string
            "frequency": 1,
            "timestamp": self._get_rfc3339_timestamp()
        }
        
        uuid = collection.data.insert(data_object)
        print(f"✓ Stored scheduling pattern (UUID: {uuid})")
        return uuid

    
    def find_similar_patterns(self, user_id: str, task_description: str, 
                            limit: int = 5):
        """Find similar past scheduling decisions"""
        
        collection = self.client.collections.get("SchedulingPattern")
        
        response = collection.query.near_text(
            query=task_description,
            limit=limit,
            filters=Filter.by_property("userId").equal(user_id)
        )
        
        results = []
        for obj in response.objects:
            results.append({
                "description": obj.properties["patternDescription"],
                "task_type": obj.properties["taskType"],
                "preferred_time": obj.properties["preferredTime"],
                "duration": obj.properties["duration"],
                "day_pattern": obj.properties["dayPattern"]
            })
        
        return results
    
    def close(self):
        """Close connection properly"""
        self.client.close()
        print("✓ Weaviate connection closed")
