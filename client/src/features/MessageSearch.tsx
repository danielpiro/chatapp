import React, { useState } from 'react';
import { TextField, List, ListItem, ListItemText, Typography, Box, Divider, Avatar } from '@mui/material';

interface Message {
  sender: string;
  content: string;
  timestamp: Date;
}

interface MessageSearchProps {
  messages: Message[];
}

const MessageSearch: React.FC<MessageSearchProps> = ({ messages }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    const results = messages.filter(message => 
      message.content.toLowerCase().includes(term) ||
      message.sender.toLowerCase().includes(term)
    );

    setSearchResults(results);
  };

  return (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search messages..."
        value={searchTerm}
        onChange={handleSearch}
        sx={{ mb: 2, borderRadius: 1 }}
      />
      {searchTerm && (
        <List>
          {searchResults?.map((message, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  {message.sender.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {message.sender}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(message.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {message.content}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < searchResults.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default MessageSearch;
