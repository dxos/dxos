//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField } from '@mui/material';

import { Party } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { Dialog } from '@dxos/react-components';

import { ImportMenu, ImportOption } from '../ImportMenu';

export interface PartySettingsDialogProps {
  open: boolean
  party?: Party // TODO(burdon): Just pass in properties
  importOptions?: ImportOption[]
  onClose: () => void
  onUpdate: (party?: Party, title?: string, description?: string) => Promise<void>
  onImport?: (party: Party) => Promise<void>
}

export const PartySettingsDialog = ({
  open,
  party,
  importOptions = [],
  onClose,
  onUpdate,
  onImport
}: PartySettingsDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useAsyncEffect(async () => {
    setTitle(party?.getProperty('title') ?? '');
    setDescription(party?.getProperty('description') ?? '');
  }, [party]);

  const handleSubmit = async () => {
    if (title.length === 0) {
      return;
    }

    await onUpdate(party, title, description);
    onClose?.();
  };

  const content = (
    <>
      <TextField
        fullWidth
        autoFocus
        variant='outlined'
        label='Title'
        autoComplete='off'
        spellCheck={false}
        value={title}
        onChange={event => setTitle(event.target.value)}
        onKeyPress={event => (event.key === 'Enter') && handleSubmit()}
      />

      <TextField
        sx={{
          '&.MuiFormControl-root': {
            marginTop: 2
          }
        }}
        fullWidth
        multiline
        rows={3}
        variant='outlined'
        label='Description'
        autoComplete='off'
        spellCheck={false}
        value={description}
        onChange={event => setDescription(event.target.value)}
      />
    </>
  );

  const actions = (
    <Box
      display='flex'
      justifyContent='space-between'
      width='100%'
    >
      {party ? (
        <Box />
      ) : (
        <ImportMenu
          options={importOptions}
          onImport={async party => {
            await onImport?.(party);
            onClose?.();
          }}
        />
      )}
      <Box>
        <Button tabIndex={2} onClick={() => onClose?.()}>
          Cancel
        </Button>
        <Button tabIndex={1} onClick={handleSubmit} variant='contained' color='primary'>
          {party ? 'Update' : 'Create'}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth='xs'
      title={party ? 'Party settings' : 'Create party'}
      content={content}
      actions={actions}
    />
  );
};
