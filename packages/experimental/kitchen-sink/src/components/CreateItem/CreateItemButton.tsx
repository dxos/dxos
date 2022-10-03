//
// Copyright 2022 DXOS.org
//

import React, { MouseEvent, useState } from 'react';

import { Add as AddIcon } from '@mui/icons-material';
import { Box, Fab } from '@mui/material';

import { TestType } from '@dxos/client-testing';
import { itemAdapter } from '@dxos/react-client-testing';

import { TypeSelector } from '../TypeSelector';
import { CreateItemDialog } from './CreateItemDialog';

interface CreateItemButtonProps {
  onCreate: (type?: string, title?: string) => void
}

export const CreateItemButton = ({
  onCreate
}: CreateItemButtonProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [type, setType] = useState<string>(TestType.Org);

  const handleClick = (event: MouseEvent) => {
    if (event.metaKey) {
      onCreate();
    } else {
      setOpen(true);
    }
  };

  const handleCreate = (title: string) => {
    setOpen(false);
    onCreate(type, title);
  };

  return (
    <>
      <CreateItemDialog
        open={open}
        itemAdapter={itemAdapter}
        onCreate={(title: string) => handleCreate(title)}
        onCancel={() => setOpen(false)}
      >
        <Box sx={{ marginBottom: 1 }}>
          <TypeSelector
            value={type}
            onChange={(type: string) => setType(type)}
          />
        </Box>
      </CreateItemDialog>

      <Fab
        data-id='test-button-create-item'
        color='primary'
        onClick={handleClick}
        size='small'
        sx={{
          position: 'fixed',
          right: 16,
          bottom: 16
        }}
      >
        <AddIcon />
      </Fab>
    </>
  );
};
