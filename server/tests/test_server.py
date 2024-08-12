# server/tests/test_server.py
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_websocket_connection():
    with client.websocket_connect("/ws/testuser") as websocket:
        data = websocket.receive_text()
        assert data == "Server: testuser has joined the chat."

def test_message_broadcast():
    with client.websocket_connect("/ws/user1") as websocket1:
        with client.websocket_connect("/ws/user2") as websocket2:
            websocket1.send_text('{"sender": "user1", "content": "Hello, world!"}')
            assert websocket2.receive_text() == "user1: Hello, world!"