# server.py
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

logging.basicConfig(filename='server.log', 
                    level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger()
console = logging.StreamHandler()
console.setLevel(logging.DEBUG)
logger.addHandler(console)

app = FastAPI()

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
    status: Optional[bool] = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_statuses: Dict[str, str] = {}
        self.connection_timestamps: Dict[str, float] = {}
        self.join_messages: Dict[str, asyncio.Task] = {}
        self.has_joined: Dict[str, bool] = {}
        self.user_count = 0

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        current_time = asyncio.get_event_loop().time()

        self.active_connections[client_id] = websocket
        self.user_statuses[client_id] = 'online'
        self.connection_timestamps[client_id] = current_time
        logger.info(f"Client {client_id} connected")

        self.user_count += 1
        self.has_joined[client_id] = False

        if self.user_count > 1:
            await self.broadcast_user_statuses()

        if client_id in self.join_messages:
            self.join_messages[client_id].cancel()

        self.join_messages[client_id] = asyncio.create_task(self.send_delayed_join_message(client_id))

    async def send_delayed_join_message(self, client_id: str):
        await asyncio.sleep(3)
        if not self.has_joined[client_id] and client_id in self.active_connections:
            if self.user_count > 1:
                join_message = Message(
                    id=str(uuid.uuid4()), 
                    sender="Server", 
                    content=f"{client_id} has joined the chat.",
                    timestamp=str(datetime.datetime.now(pytz.timezone('Israel')).isoformat())
                )
                await self.broadcast({"type": "message", "message": join_message.dict()}, exclude=client_id)
                logger.info(f"Sent join message for client {client_id}")
                self.has_joined[client_id] = True  # Mark as sent

            if client_id in self.join_messages:
                del self.join_messages[client_id]

    async def disconnect(self, client_id: str):
        websocket = self.active_connections.pop(client_id, None)

        if websocket:
            if not websocket.application_state.closed:  # Check if the WebSocket is already closed
                try:
                    await websocket.close()
                except Exception as e:
                    logger.error(f"Error closing websocket for client {client_id}: {str(e)}")

        if client_id not in self.has_joined:
            return

        if client_id in self.active_connections:
            del self.active_connections[client_id]

        if client_id in self.user_statuses:
            del self.user_statuses[client_id]

        if client_id in self.join_messages:
            self.join_messages[client_id].cancel()
            del self.join_messages[client_id]

        if client_id in self.has_joined:
            del self.has_joined[client_id]

        self.user_count -= 1
        logger.info(f"Client {client_id} disconnected")
        
        await asyncio.sleep(3)
        
        if client_id not in self.active_connections and self.user_count > 0:
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
        for client_id, connection in self.active_connections.items():
            if client_id != exclude:
                try:
                    await connection.send_text(json.dumps(message))
                    logger.debug(f"Sent message to client {client_id}: {message}")
                except Exception as e:
                    logger.error(f"Error sending message to client {client_id}: {str(e)}")
                    await self.disconnect(client_id)

    async def broadcast_user_statuses(self):
        users = [{"name": name, "status": status} for name, status in self.user_statuses.items()]
        await self.broadcast({"type": "userStatus", "users": users})
        logger.info(f"Broadcasted user statuses: {users}")

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                ws_message = WebSocketMessage.parse_raw(data)
                logger.debug(f"Received message from client {client_id}: {ws_message}")

                if ws_message.type == 'message' and ws_message.message:
                    if not ws_message.message.id:
                        ws_message.message.id = str(uuid.uuid4())
                    if not ws_message.message.timestamp:
                        ws_message.message.timestamp = str(datetime.datetime.now(pytz.timezone('Israel')).isoformat())
                    await manager.broadcast({"type": "message", "message": ws_message.message.dict()})
                    logger.info(f"Broadcasted message from client {client_id}: {ws_message.message.content}")
                elif ws_message.type == 'typing':
                    manager.user_statuses[client_id] = 'typing' if ws_message.status else 'online'
                    await manager.broadcast_user_statuses()
                    logger.info(f"Client {client_id} typing status updated to {manager.user_statuses[client_id]}")
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                logger.error(f"Error processing message from client {client_id}: {str(e)}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for client {client_id}")
    finally:
        await manager.disconnect(client_id)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the FastAPI WebSocket server.")
    parser.add_argument("port", type=int, nargs='?', default=8000, help="Port number to run the server on")
    args = parser.parse_args()

    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
