//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useState } from 'react';

import { Box, Button, Dialog, DialogActions, DialogContent, TextField, Typography } from '@mui/material';

import { ItemAdapter } from '@dxos/react-client-testing';

interface CreateItemDialogProps {
  open: boolean
  type?: string
  itemAdapter: ItemAdapter
  onCreate: (title: string) => void
  onCancel: () => void
  children?: ReactNode
}

export const CreateItemDialog = ({
  open,
  type,
  itemAdapter,
  onCreate,
  onCancel,
  children
}: CreateItemDialogProps) => {
  const [title, setTitle] = useState<string>('');
  const { label = 'Item', icon: Icon } = (type ? itemAdapter.meta?.(type) : undefined) ?? {};

  const handleSubmit = () => {
    const value = title.trim();
    if (value.length) {
      onCreate(value);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter': {
        event.preventDefault();
        handleSubmit();
        break;
      }

      case 'Escape': {
        onCancel();
        break;
      }
    }
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth='xs'
    >
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant='h6' sx={{ flex: 1 }}>
            New {label}
          </Typography>
          {Icon && (
            <Icon />
          )}
        </Box>
      </DialogContent>

      <DialogContent>
        {children}

        <TextField
          autoFocus
          margin='dense'
          fullWidth
          variant='standard'
          spellCheck={false}
          autoComplete='off'
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Create</Button>
      </DialogActions>
    </Dialog>
  );
};
