//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import {
  Button,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';

import { FileUploadDialog, Dialog } from '@dxos/react-components';

interface InvitationDialogProps {
  open: boolean
  title?: string
  modal?: boolean
  onCreate?: () => void,
  onJoin?: (invitationCode: string) => void
  onImport?: (file: File | string) => void
}

/**
 * Home page.
 */
export const TestInvitationDialog = ({
  open,
  title = 'Demo',
  modal = false,
  onCreate,
  onJoin,
  onImport
}: InvitationDialogProps) => {
  const [invitationCodeOrIpfsCid, setInvitationCodeOrIpfsCid] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [fileUploadDialogOpen, setFileUploadDialogOpen] = useState(false);

  const handleImport = async (files: File[] | string | null) => {
    if (!files) {
      return;
    }

    setInProgress(true);
    setError(undefined);
    try {
      if (typeof files === 'string') {
        await onImport!(files);
      } else {
        await onImport!(files[0]);
      }
    } catch (error: any) {
      setError(error);
    } finally {
      setInProgress(false);
    }
  };

  const content = (
    <>
      <TextField
        fullWidth
        value={invitationCodeOrIpfsCid}
        onChange={event => setInvitationCodeOrIpfsCid(event.target.value)}
        variant='outlined'
        label='Invitation code or IPFS CID'
        autoComplete='off'
        spellCheck={false}
        inputProps={{
          'data-id': 'test-input-join'
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
            data-id='test-button-import'
            color='primary'
            variant='outlined'
            disabled={inProgress}
            onClick={() => setFileUploadDialogOpen(true)}
          >
            Import Local Party
          </Button>
          <Button
            disabled={inProgress}
            onClick={() => handleImport(invitationCodeOrIpfsCid)}
          >
            Import IPFS Party
          </Button>
        </>
      )}
      {onJoin && (
        <Button
          data-id='test-button-join'
          color='secondary'
          variant='contained'
          onClick={async () => {
            setInProgress(true);
            setError(undefined);
            try {
              await onJoin!(invitationCodeOrIpfsCid);
            } catch (error: any) {
              setError(error);
            } finally {
              setInProgress(false);
            }
          }}
          disabled={!invitationCodeOrIpfsCid || inProgress}
        >
          Join Party
        </Button>
      )}
      {onCreate && (
        <Button
          data-id='test-button-create'
          color='primary'
          variant='contained'
          onClick={() => {
            setInProgress(true);
            onCreate!();
          }}
          disabled={inProgress}
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
    >
    </Dialog>
  );
};
