import React, { useState } from 'react';
import { TextField, List, ListItem, ListItemText, Typography } from '@mui/material';

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
    <div>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search messages..."
        value={searchTerm}
        onChange={handleSearch}
      />
      {searchTerm && (
        <List>
          {searchResults.map((message, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={<Typography variant="body2">{message.sender}</Typography>}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      {message.content}
                    </Typography>
                    {" — " + new Date(message.timestamp).toLocaleString()}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default MessageSearch;