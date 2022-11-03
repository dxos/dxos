//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, LinearProgress, TextField, Typography } from '@mui/material';

import { useMounted } from '@dxos/react-async';
import { Dialog } from '@dxos/react-components';

import { ImportMenu } from './ImportMenu';

export interface CreatePartyDialogProps {
  open: boolean;
  title?: string;
  modal?: boolean;
  onCreate?: () => void;
  onJoin?: (invitationCode: string) => void;
  onImport?: (file: File | string) => void;
}

/**
 * Dialog to create, join, or import party.
 */
export const CreatePartyDialog = ({
  open,
  title = 'New Party',
  modal = true,
  onCreate,
  onJoin,
  onImport
}: CreatePartyDialogProps) => {
  const [invitationCodeOrIpfsCid, setInvitationCodeOrIpfsCid] = useState('');
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const isMounted = useMounted();

  const handleImport = async (file: File | string) => {
    setInProgress(true);
    setError(undefined);
    try {
      await onImport!(file);
    } catch (err: any) {
      setError(err);
    } finally {
      if (isMounted()) {
        setInProgress(false);
      }
    }
  };

  const content = (
    <>
      <TextField
        fullWidth
        value={invitationCodeOrIpfsCid}
        onChange={(event) => setInvitationCodeOrIpfsCid(event.target.value)}
        variant='outlined'
        label='Invitation code'
        autoComplete='off'
        spellCheck={false}
        inputProps={{
          'data-id': 'test-input-join-party'
        }}
      />
      <div style={{ height: 8, marginTop: 16 }}>{inProgress && <LinearProgress />}</div>
      {error && <Typography>{String(error.stack)}</Typography>}
    </>
  );

  const actions = (
    <>
      {onImport && (
        <>
          <ImportMenu onImport={handleImport} />

          <Box sx={{ flex: 1 }} />
        </>
      )}

      {onJoin && (
        <Button
          data-id='test-button-join-party'
          color='secondary'
          variant='contained'
          disabled={!invitationCodeOrIpfsCid || inProgress}
          onClick={async () => {
            setInProgress(true);
            setError(undefined);
            try {
              await onJoin!(invitationCodeOrIpfsCid);
            } catch (err: any) {
              setError(err);
            } finally {
              setInProgress(false);
            }
          }}
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

  return <Dialog open={open} modal={modal} maxWidth='sm' fullWidth title={title} content={content} actions={actions} />;
};
