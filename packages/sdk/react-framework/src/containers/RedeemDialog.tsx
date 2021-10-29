//
// Copyright 2020 DXOS.org
//

import { Redeem as RedeemIcon } from '@mui/icons-material';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';

import { defaultInvitationAuthenticator, InvitationDescriptor } from '@dxos/echo-db';
import { useClient, useInvitationRedeemer } from '@dxos/react-client';

import { DialogHeading } from '../components';
import { handleRedeemError } from '../helpers';

interface RedeemDialogProps {
  open: boolean
  onClose?: () => void
  code?: string
  pinless?: boolean
}

/**
 * Component used for claiming invitations to Parties.
 * Works for both regular and `Offline` invitations.
 * @deprecated
 */
export const RedeemDialog = ({ open, code = '', onClose, pinless = false }: RedeemDialogProps) => {
  const [isOffline] = useState(false);
  // issue(grazianoramiro): https://github.com/dxos/protocols/issues/197
  // const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string>();
  const [step, setStep] = useState(0); // TODO(burdon): Const.
  const [invitationCode, setInvitationCode] = useState(code);
  const [pinCode, setPinCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const client = useClient();

  const handleDone = () => {
    setStep(0);
    setInvitationCode('');
    setPinCode('');
    setIsProcessing(false);
    onClose?.();
  };

  const handleInvitationError = (error: string) => {
    setStep(2);
    const err = handleRedeemError(error); // TODO(burdon): Rename.
    setError(err);
  };

  const [redeemCode, setPin] = useInvitationRedeemer({
    onDone: () => handleDone,
    onError: (error?: string) => handleInvitationError(String(error)),
    isOffline
  });

  const handleEnterInvitationCode = async () => {
    if (isProcessing) {
      return;
    }
    if (pinless) {
      setIsProcessing(true);
      setError('');
      try {
        // TODO(burdon): Move to callback.
        // TODO(burdon): This is duplicated from useInvitationRedeemer.
        const party = await client.echo.joinParty(
          InvitationDescriptor.fromQueryParameters(JSON.parse(invitationCode)),
          defaultInvitationAuthenticator.secretProvider
        );
        await party.open();
        handleDone();
      } catch (error: any) {
        handleInvitationError(String(error));
      }
    } else {
      redeemCode(invitationCode);
      setStep(1);
    }
  };

  const handleEnterPinCode = async () => {
    setIsProcessing(true);
    setPin(pinCode);
  };

  const handleKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter') {
      void handleEnterInvitationCode();
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth='xs'
      open={!!open}
      onClose={step === 0 ? handleDone : undefined} // No click away when in the middle of a flow.
    >
      <DialogHeading title='Redeem Invitation' icon={RedeemIcon} />

      {step === 0 && (
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
              onKeyDown={handleKeyDown}
              rows={6}
            />

            {/*
            issue(grazianoramiro): https://github.com/dxos/protocols/issues/197
            <FormControlLabel
              className={classes.marginTop}
              control={<Checkbox checked={isOffline} onChange={(event) => setIsOffline(event.target.checked)} />}
              label='Offline'
            /> */}
            {isProcessing && <LinearProgress />}
          </DialogContent>
          <DialogActions>
            <Button color='secondary' onClick={handleDone}>
              Cancel
            </Button>
            <Button variant='contained' color='primary' onClick={handleEnterInvitationCode} disabled={isProcessing}>
              Submit
            </Button>
          </DialogActions>
        </>
      )}

      {step === 1 && setPin && (
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
            />
            {isProcessing && <LinearProgress />}
          </DialogContent>
          <DialogActions>
            <Button color='secondary' onClick={handleDone}>
              Cancel
            </Button>
            <Button variant='contained' color='primary' onClick={handleEnterPinCode} disabled={isProcessing}>
              Submit
            </Button>
          </DialogActions>
        </>
      )}

      {step === 1 && !setPin && (
        <DialogContent>
          <LinearProgress />
          <Typography variant='body1' sx={{ marginTop: 1 }} gutterBottom>
            Processing...
          </Typography>
        </DialogContent>
      )}

      {step === 2 && error && (
        <DialogContent>
          <Alert severity='error'>{error}</Alert>
          <DialogActions>
            <Button autoFocus color='secondary' onClick={handleDone}>
              Cancel
            </Button>
          </DialogActions>
        </DialogContent>
      )}
    </Dialog>
  );
};
