//
// Copyright 2020 DXOS.org
//

import { Redeem as RedeemIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';

import { DialogHeading } from '../components';

interface Result { error: Error | undefined }

type ResultType = void | Promise<Result | void> | Result

enum Stage {
  ENTER_INVITATION = 0,
  ENTER_PIN = 1
}

interface RedeemDialogWithoutClientProps {
  open: boolean
  onEnterInvitationCode: (invitationCode: string) => ResultType
  onEnterPin?: (pin: string) => ResultType
  onClose: () => void
}

// TODO(burdon): Should the dialog manage it's state or be passive?

interface ReedeemDialogModel {
  stage: Stage
  error: Error // Would require effect hook to update state.
  onEnterInvitationCode: () => void
  onEnterPin: () => void
}

/**
 * Component used for claiming invitations to Parties.
 * Works for both regular and `Offline` invitations.
 */
export const RedeemDialogWithoutClient = ({
  open,
  onEnterInvitationCode,
  onEnterPin,
  onClose // TODO(burdon): onSuccess
}: RedeemDialogWithoutClientProps) => {
  // TODO(grazianoramiro): https://github.com/dxos/protocols/issues/197
  // const [isOffline, setIsOffline] = useState(false);
  const [stage, setStage] = useState<Stage>(Stage.ENTER_INVITATION);
  const [error, setError] = useState<Error | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [pinCode, setPinCode] = useState('');

  // TODO(burdon): Remove?
  const handleDone = () => {
    setStage(Stage.ENTER_INVITATION);
    setError(undefined);
    setIsProcessing(false);
    setInvitationCode('');
    setPinCode('');
    onClose();
  };

  const handleEnterInvitationCode = async () => {
    setError(undefined);
    setIsProcessing(true);
    const { error } = await onEnterInvitationCode(invitationCode) || {};
    setIsProcessing(false);
    if (error) {
      setError(error);
    } else {
      if (onEnterPin) {
        setStage(Stage.ENTER_PIN);
      } else {
        handleDone();
      }
    }
  };

  const handleEnterPinCode = async () => {
    setError(undefined);
    setIsProcessing(true);
    const { error } = await onEnterPin!(pinCode) || {};
    setIsProcessing(false);
    if (error) {
      setError(error);
    } else {
      handleDone();
    }
  };

  const handleInvitationKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter') {
      void handleEnterInvitationCode();
    }
  };

  const handlePinKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter') {
      void handleEnterPinCode();
    }
  };

  const State = ({ isProcessing, error }: { isProcessing?: boolean, error?: Error }) => {
    return (
      <Box sx={{ marginTop: 2 }}>
        {isProcessing && <LinearProgress />}
        {error && <Alert severity='error'>{String(error)}</Alert>}
      </Box>
    );
  };

  // TODO(burdon): Reuse common dialog.
  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth='xs'
      onClose={stage === 0 ? handleDone : undefined} // Prevent click-away when in the middle of a flow.
    >
      <DialogHeading
        title='Redeem Invitation'
        icon={RedeemIcon}
      />

      {/*
      Error code.
      */}
      {stage === Stage.ENTER_INVITATION && (
        <>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              multiline
              variant='standard'
              placeholder='Paste invitation code.'
              spellCheck={false}
              value={invitationCode}
              onChange={(event) => setInvitationCode(event.target.value)}
              onKeyDown={handleInvitationKeyDown}
              rows={6}
            />

            {/*
            TODO(grazianoramiro): https://github.com/dxos/protocols/issues/197
            <FormControlLabel
              className={classes.marginTop}
              control={<Checkbox checked={isOffline} onChange={(event) => setIsOffline(event.target.checked)} />}
              label='Offline'
            />
            */}

            <State isProcessing={isProcessing} error={error} />
          </DialogContent>
          <DialogActions>
            <Button
              color='secondary'
              onClick={handleDone}
              disabled={!invitationCode.length}
            >
              Cancel
            </Button>
            <Button
              variant='contained'
              color='primary'
              onClick={handleEnterInvitationCode}
              disabled={isProcessing}
            >
              Process
            </Button>
          </DialogActions>
        </>
      )}

      {/*
      Check pin
      TODO(burdon): Use Pin control.
      */}
      {stage === Stage.ENTER_PIN && (
        <>
          <DialogContent>
            <Typography variant='body1' gutterBottom>
              Enter the PIN number.
            </Typography>
            <TextField
              value={pinCode}
              onChange={(event) => setPinCode(event.target.value)}
              variant='outlined'
              margin='normal'
              required
              fullWidth
              label='PIN Code'
              autoFocus
              disabled={isProcessing}
              onKeyDown={handlePinKeyDown}
            />
            <State isProcessing={isProcessing} error={error} />
          </DialogContent>
          <DialogActions>
            <Button
              color='secondary'
              onClick={handleDone}
            >
              Cancel
            </Button>
            <Button
              variant='contained'
              color='primary'
              onClick={handleEnterPinCode}
              disabled={isProcessing}
            >
              Submit
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
