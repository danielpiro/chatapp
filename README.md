# Multi-Instance Chat Application

## Overview

This project is a real-time chat application built with React, TypeScript, and FastAPI. It supports multiple chat instances, allowing users to communicate in real-time across different windows or devices.

## Features

- Real-time messaging using WebSocket technology
- Support for multiple chat instances
- Message threading and reply functionality
- Emoji support
- Dark mode toggle
- Message search functionality
- Responsive design using Material-UI

## Technology Stack

- Frontend:
  - React
  - TypeScript
  - Material-UI
  - Emoji Mart
- Backend:
  - FastAPI (Python)
  - WebSockets
- Build Tool:
  - Electron (for desktop application packaging)

## Project Structure

```
chat-app/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
├── server/
│   ├── server.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- Python (v3.1 or later)
- npm or yarn

### Server Setup

1. Navigate to the `server` directory:
   ```
   cd server
   ```
2. Create a virtual environment:
   ```
   python -m venv venv
   ```
3. Activate the virtual environment:
   - On Windows: `venv\Scripts\activate`
   - On macOS/Linux: `source venv/bin/activate`
4. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

### Client Setup

1. Navigate to the `client` directory:
   ```
   cd client
   ```
2. Install dependencies:
   ```
   npm install
   ```

## Running the Application

### Start the Server

1. In the `server` directory, with the virtual environment activated, run:
   ```
   python server.py <port>
   ```

### Start the Client

1. In the `client` directory, run:
   ```
   npm run electron:serve
   ```
2. The application should open in your default web browser. If it doesn't, navigate to `http://localhost:3000`.

## Building for Production

To create a production build of the client:

1. In the `client` directory, run:
   ```
   npm run build
   ```

To package the application as a desktop app using Electron:

1. In the `client` directory, run:
   ```
   npm run electron:build
   ```
2. This will create a `release` folder containing the packaged application.
3. Inside the `release` folder, you will find a `Chat App.exe` file, which is the executable for the desktop application.

## Usage

1. Open the application in a web browser or run the Electron app.
2. Enter your name and the server port to join a chat room.
3. Start chatting! You can open multiple windows to simulate different users.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
