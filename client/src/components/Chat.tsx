import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, TextField, Button, Typography, List, ListItem, 
  ListItemText, ListItemAvatar, Avatar, AppBar, Toolbar, 
  IconButton, Popover, Drawer
} from '@mui/material';
import { Brightness4, Brightness7, EmojiEmotions, Search } from '@mui/icons-material';
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import MessageSearch from '../features/MessageSearch';
import ReplyMessage from '../features/ReplyMessage';
import { Message, handleReply, createMessage } from '../features/messageThreading';
import { setupWebSocket, WebSocketHandler } from '../features/websocketHandler';

interface ChatProps {
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const Chat: React.FC<ChatProps> = ({ setDarkMode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [wsHandler, setWsHandler] = useState<WebSocketHandler | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { name, port } = location.state as { name: string; port: string };
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    console.log('Connecting to WebSocket server...');
    const handler = setupWebSocket(
      `ws://localhost:${port}/ws/${name}`,
      (message) => {
        console.log("Received message in Chat component:", message);
        setMessages(prev => {
          console.log("Previous messages:", prev);
          const newMessages = [...prev, message];
          console.log("New messages:", newMessages);
          return newMessages;
        });
      },
    );
    setWsHandler(handler);

    return () => {
      handler.close();
    };
  }, [name, port]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage && wsHandler) {
      const message = createMessage(name, inputMessage, replyingTo);
      wsHandler.sendMessage(message);
      setInputMessage('');
      setReplyingTo(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  const handleEmojiSelect = (emoji: any) => {
    setInputMessage(prevMessage => prevMessage + emoji.native);
    setEmojiAnchorEl(null);
  };

  const handleQuit = () => {
    if (wsHandler) {
      wsHandler.close();
    }
    navigate('/login');
  };

  const toggleDarkMode = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  const openNewWindow = () => {
    window.open(`${window.location.origin}${window.location.pathname}?name=${encodeURIComponent(name)}&port=${port}`, '_blank');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Chat Room
          </Typography>
          <IconButton color="inherit" onClick={toggleSearch}>
            <Search />
          </IconButton>
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {localStorage.getItem('darkMode') === 'true' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <Button color="inherit" onClick={openNewWindow}>New Window</Button>
          <Button color="inherit" onClick={handleQuit}>
            Quit
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages?.map((message) => (
            <ListItem key={message.id} alignItems="flex-start">
              <ListItemAvatar>
                <Avatar alt={message.sender} src={`https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(message.sender)}`} />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography
                    component="span"
                    variant="body2"
                    style={{ color: `#${message.sender.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString(16).slice(-6)}`, fontWeight: 'bold' }}
                  >
                    {message.sender}
                  </Typography>
                }
                secondary={
                  <>
                    {message.replyTo && (
                      <ReplyMessage replyToMessage={messages.find(m => m.id === message.replyTo)} />
                    )}
                    <Typography component="span" variant="body1" color="text.primary">
                      {message.content}
                    </Typography>
                    {" — " + new Date(message.timestamp).toLocaleString()}
                    <Button size="small" onClick={() => handleReply(message.id, setReplyingTo)}>Reply</Button>
                  </>
                }
              />
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
        <Drawer
          anchor="right"
          open={isSearchOpen}
          onClose={toggleSearch}
          sx={{
            width: 300,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 300,
            },
          }}
        >
          <MessageSearch messages={messages} />
        </Drawer>
      </Box>
      <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, backgroundColor: 'background.default', display: 'flex', alignItems: 'center' }}>
        {replyingTo && (
          <ReplyMessage replyToMessage={messages.find(m => m.id === replyingTo)} />
        )}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message"
          value={inputMessage}
          onChange={handleInputChange}
          sx={{ mr: 1 }}
        />
        <IconButton onClick={(e) => setEmojiAnchorEl(e.currentTarget)}>
          <EmojiEmotions />
        </IconButton>
        <Button type="submit" variant="contained">
          Send
        </Button>
      </Box>
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Picker data={data} onEmojiSelect={handleEmojiSelect} />
      </Popover>
    </Box>
  );
};

export default Chat;
