//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useState } from 'react';

import { Button, LinearProgress, TextField, Typography } from '@mui/material';

import { FileUploadDialog, Dialog } from '@dxos/react-components';

const log = debug('dxos:kitchen-sink');

interface InvitationDialogProps {
  open: boolean
  title?: string
  modal?: boolean
  onCreate?: () => void,
  onJoin?: (invitationCode: string) => void
  onImport?: (file: File) => void
}

/**
 * Home page.
 */
export const InvitationDialog = ({
  open,
  title = 'Kitchen Sink',
  modal = true,
  onCreate,
  onJoin,
  onImport
}: InvitationDialogProps) => {
  const [invitationCode, setInvitationCode] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [fileUploadDialogOpen, setFileUploadDialogOpen] = useState(false);

  const handleImport = async (files: File[] | null) => {
    if (!files) {
      return;
    }

    const file = files[0];

    setInProgress(true);
    setError(undefined);
    try {
      await onImport!(file);
    } catch (error: any) {
      log(error);
      setError(error);
    } finally {
      setInProgress(false);
    }
  };

  const content = (
    <>
      <TextField
        fullWidth
        value={invitationCode}
        onChange={event => setInvitationCode(event.target.value)}
        variant='outlined'
        label='Invitation code'
        autoComplete='off'
        spellCheck={false}
        inputProps={{
          'data-id': 'test-input-join-party'
        }}
      />
      <div style={{ height: 8, marginTop: 16 }}>
        {inProgress && <LinearProgress />}
      </div>
      {error && <Typography>{String(error.stack)}</Typography>}
    </>
  );

  const actions = (
    <>
      {onImport && (
        <>
          <FileUploadDialog
            open={fileUploadDialogOpen}
            onClose={() => setFileUploadDialogOpen(false)}
            onUpload={handleImport}
          />
          <Button
            data-id='test-button-import-party'
            color='primary'
            variant='outlined'
            disabled={inProgress}
            onClick={() => setFileUploadDialogOpen(true)}
          >
            Import Party
          </Button>
        </>
      )}

      {onJoin && (
        <Button
          data-id='test-button-join-party'
          color='secondary'
          variant='contained'
          onClick={async () => {
            setInProgress(true);
            setError(undefined);
            try {
              await onJoin!(invitationCode);
            } catch (error: any) {
              log(error);
              setError(error);
            } finally {
              setInProgress(false);
            }
          }}
          disabled={!invitationCode || inProgress}
        >
          Join Party
        </Button>
      )}

      {onCreate && (
        <Button
          data-id='test-button-create-party'
          color='primary'
          variant='contained'
          disabled={inProgress}
          onClick={() => {
            setInProgress(true);
            onCreate!();
          }}
        >
          Create Party
        </Button>
      )}
    </>
  );

  return (
    <Dialog
      open={open}
      modal={modal}
      fullWidth
      maxWidth='sm'
      title={title}
      content={content}
      actions={actions}
    />
  );
};
