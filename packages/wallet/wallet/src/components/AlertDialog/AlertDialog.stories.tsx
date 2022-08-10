//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField } from '@mui/material';

import { Toolbar } from '@dxos/react-components';

import { AlertDialog } from './AlertDialog';

export default {
  title: 'react-appkit/AlertDialog'
};

export const Primary = () => {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState('Alert Title');
  const [content, setContent] = useState('This is an alert!');

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <TextField
          label='Title'
          value={title}
          onChange={event => setTitle(event.target.value)}
        />
        <TextField
          label='Content'
          value={content}
          onChange={event => setContent(event.target.value)}
        />
      </Toolbar>

      <AlertDialog
        open={open}
        title={title}
        content={content}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
};
