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

logging.basicConfig(filename='server.log', 
                    level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

logger = logging.getLogger()

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

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.user_statuses[client_id] = 'online'
        logger.info(f"Client {client_id} connected")
        await self.broadcast_user_statuses()

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.user_statuses:
            del self.user_statuses[client_id]
        logger.info(f"Client {client_id} disconnected")

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_text(json.dumps(message))

    async def broadcast_user_statuses(self):
        users = [{"name": name, "status": status} for name, status in self.user_statuses.items()]
        await self.broadcast({"type": "userStatus", "users": users})
        logger.info("Broadcasted user statuses")

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        join_message = Message(id=str(uuid.uuid4()), sender="Server", content=f"{client_id} has joined the chat." , timestamp=str(datetime.datetime.now(pytz.timezone('Israel')).isoformat()))
        await manager.broadcast({"type": "message", "message": join_message.dict()})
        logger.info(f"Sent join message for client {client_id}")

        while True:
            data = await websocket.receive_text()
            ws_message = WebSocketMessage.parse_raw(data)
            #TODO: need to check why message is None

            logger.debug(f"Received message from client {client_id}: {ws_message}")

            if ws_message.type == 'message' and ws_message.message:
                if not ws_message.message.id:
                    ws_message.message.id = str(uuid.uuid4())
                if not ws_message.message.timestamp:
                    ws_message.message.timestamp = str(datetime.datetime.now(pytz.timezone('Israel')).isoformat())
                await manager.broadcast({"type": "message", "message": ws_message.message.dict()})
                logger.info(f"Broadcasted message from client {client_id}")
            elif ws_message.type == 'typing':
                manager.user_statuses[client_id] = 'typing' if ws_message.status else 'online'
                await manager.broadcast_user_statuses()
                logger.info(f"Client {client_id} typing status updated to {manager.user_statuses[client_id]}")
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await manager.broadcast_user_statuses()
        leave_message = Message(id=str(uuid.uuid4()), sender="Server", content=f"{client_id} has left the chat.")
        await manager.broadcast({"type": "message", "message": leave_message.dict()})
        logger.info(f"Sent leave message for client {client_id}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the FastAPI WebSocket server.")
    parser.add_argument("port", type=int, nargs='?', default=8000, help="Port number to run the server on")
    args = parser.parse_args()

    uvicorn.run(app, host="0.0.0.0", port=args.port)
