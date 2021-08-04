//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import LinearProgress from '@material-ui/core/LinearProgress';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import RedeemIcon from '@material-ui/icons/Redeem';
import Alert from '@material-ui/lab/Alert';

import { useClient } from '@dxos/react-client';

import DialogHeading from './DialogHeading';
import { InvitationDescriptor } from '@dxos/echo-db';

const useStyles = makeStyles((theme) => ({
  marginTop: {
    marginTop: theme.spacing(2)
  },
  title: {
    marginLeft: theme.spacing(2)
  }
}));

/**
 * Component used for claiming invitations to Parties.
 * Works for both regular and `Offline` invitations.
 */
const PinlessRedeemDialog = ({ onClose, ...props }: { onClose: () => void }) => {
  const [invitationCode, setInvitationCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const client = useClient();
  const handleDone = () => {
    setInvitationCode('');
    setIsProcessing(false);
    onClose();
  };


  // (zarco) TODO: add error handling
  const handleJoinParty = async (invitationCode: string) => {
    const party = await client.echo.joinParty(
      InvitationDescriptor.fromQueryParameters(JSON.parse(invitationCode)),
      async () => Buffer.from('0000')
    );

    await party.open();
  };

  const handleEnterInvitationCode = async () => {
    if (isProcessing) {
      return;
    }
    setIsProcessing(true);
    await handleJoinParty(invitationCode);
    handleDone();
  };


  const handleKeyDown = (event: { key: string }) => {
    if (event.key === 'Enter') {
      handleEnterInvitationCode();
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth='xs'
      open
      onClose={handleDone} // No click away when in the middle of a flow
      {...props}
    >
      <DialogHeading title='Redeem Invitation' icon={RedeemIcon} />

      <>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              multiline
              placeholder='Paste invitation code.'
              spellCheck={false}
              value={invitationCode}
              onChange={(event) => setInvitationCode(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
            />
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

    </Dialog>
  );
};

export default PinlessRedeemDialog;
