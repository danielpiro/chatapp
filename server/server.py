import argparse
import datetime
import logging
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict
import json
import uuid
import pytz
import asyncio

# Set up logging configuration
logging.basicConfig(filename='server.log', 
                    level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger()
console = logging.StreamHandler()
console.setLevel(logging.DEBUG)
logger.addHandler(console)

# Initialize FastAPI application
app = FastAPI()

# Define data models
class Message(BaseModel):
    id: str
    sender: str
    content: str
    timestamp: Optional[str] = None
    replyTo: Optional[str] = None

class WebSocketMessage(BaseModel):
    type: str
    message: Optional[Message] = None
    sender: Optional[str] = None

class ConnectionManager:
    def __init__(self):
        # Dictionary to store active WebSocket connections
        self.active_connections: Dict[str, WebSocket] = {}
        # Dictionary to store user statuses
        self.user_statuses: Dict[str, str] = {}
        # Dictionary to store connection timestamps
        self.connection_timestamps: Dict[str, float] = {}
        # Dictionary to store join message tasks
        self.join_messages: Dict[str, asyncio.Task] = {}
        # Dictionary to track if a user has joined
        self.has_joined: Dict[str, bool] = {}
        # Counter for active users
        self.user_count = 0

    async def connect(self, websocket: WebSocket, client_id: str):
        # Accept the WebSocket connection
        await websocket.accept()
        current_time = asyncio.get_event_loop().time()

        # Store connection details
        self.active_connections[client_id] = websocket
        self.user_statuses[client_id] = 'online'
        self.connection_timestamps[client_id] = current_time
        logger.info(f"Client {client_id} connected")

        # Update user count and join status
        self.user_count += 1
        self.has_joined[client_id] = False

        # Broadcast user statuses if there's more than one user
        if self.user_count > 1:
            await self.broadcast_user_statuses()

        # Cancel any existing join message task for this client
        if client_id in self.join_messages:
            self.join_messages[client_id].cancel()

        # Create a new task to send a delayed join message
        self.join_messages[client_id] = asyncio.create_task(self.send_delayed_join_message(client_id))

    async def send_delayed_join_message(self, client_id: str):
        # Wait for 1 second before sending the join message
        await asyncio.sleep(1)
        join_message = Message(
            id=str(uuid.uuid4()), 
            sender="Server", 
            content=f"{client_id} has joined the chat.",
            timestamp=str(datetime.datetime.now(pytz.timezone('Israel')).isoformat())
        )
        # Broadcast the join message to all clients except the one who joined
        await self.broadcast({"type": "message", "message": join_message.dict()}, exclude=client_id)
        logger.info(f"Sent join message for client {client_id}")
        self.has_joined[client_id] = True

    async def disconnect(self, client_id: str):
        # Check if the client is still in active connections
        if client_id not in self.active_connections:
            return

        # Remove client from all data structures
        del self.active_connections[client_id]
        del self.user_statuses[client_id]
        del self.connection_timestamps[client_id]
        if client_id in self.has_joined:
            del self.has_joined[client_id]
        if client_id in self.join_messages:
            self.join_messages[client_id].cancel()
            del self.join_messages[client_id]

        # Update user count and log the disconnection
        self.user_count -= 1
        logger.info(f"Client {client_id} disconnected")

        # If there are still active users, broadcast updated statuses and leave message
        if self.user_count > 0:
            await self.broadcast_user_statuses()
            leave_message = Message(
                id=str(uuid.uuid4()),
                sender="Server",
                content=f"{client_id} has left the chat.",
                timestamp=str(datetime.datetime.now(pytz.timezone('Israel')).isoformat())
            )
            await self.broadcast({"type": "message", "message": leave_message.dict()})
            logger.info(f"Sent leave message for client {client_id}")

    async def broadcast(self, message: dict, exclude: Optional[str] = None):
        # List to store clients that couldn't receive the message
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            if client_id != exclude:
                try:
                    # Send the message to each connected client
                    await connection.send_text(json.dumps(message))
                    logger.debug(f"Sent message to client {client_id}: {message}")
                except Exception as e:
                    # If sending fails, add client to disconnected list
                    logger.error(f"Error sending message to client {client_id}: {str(e)}")
                    disconnected_clients.append(client_id)

        # Disconnect clients that couldn't receive the message
        for client_id in disconnected_clients:
            await self.disconnect(client_id)

    async def broadcast_user_statuses(self):
        # Create a list of user statuses
        users = [{"name": name, "status": status} for name, status in self.user_statuses.items()]
        # Broadcast the user statuses to all connected clients
        await self.broadcast({"type": "userStatus", "users": users})
        logger.info(f"Broadcasted user statuses: {users}")

# Create an instance of the ConnectionManager
manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    # Connect the new client
    await manager.connect(websocket, client_id)
    try:
        while True:
            try:
                # Wait for a message from the client with a 1-second timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                ws_message = WebSocketMessage.parse_raw(data)
                logger.debug(f"Received message from client {client_id}: {ws_message}")

                # If the message is a chat message, process and broadcast it
                if ws_message.type == 'message' and ws_message.message:
                    if not ws_message.message.id:
                        ws_message.message.id = str(uuid.uuid4())
                    if not ws_message.message.timestamp:
                        ws_message.message.timestamp = str(datetime.datetime.now(pytz.timezone('Israel')).isoformat())
                    await manager.broadcast({"type": "message", "message": ws_message.message.dict()})
                    logger.info(f"Broadcasted message from client {client_id}: {ws_message.message.content}")
            except asyncio.TimeoutError:
                # Timeout occurred, continue to next iteration
                pass
            except Exception as e:
                # Log any other exceptions and break the loop
                logger.error(f"Error processing message from client {client_id}: {str(e)}")
                break

    except WebSocketDisconnect:
        # Log when a WebSocket disconnects
        logger.info(f"WebSocket disconnected for client {client_id}")
    finally:
        # Ensure the client is disconnected when the WebSocket closes
        await manager.disconnect(client_id)

if __name__ == "__main__":
    # Set up command-line argument parsing
    parser = argparse.ArgumentParser(description="Run the FastAPI WebSocket server.")
    parser.add_argument("port", type=int, nargs='?', default=8000, help="Port number to run the server on")
    args = parser.parse_args()

    # Run the FastAPI application with uvicorn
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")