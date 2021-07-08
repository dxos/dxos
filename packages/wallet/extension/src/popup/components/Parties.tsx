//
// Copyright 2021 DXOS.org
//

//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Card, CardContent, makeStyles, TextField, Button } from '@material-ui/core';
import { GetPartiesResponse } from '@dxos/wallet-core';
import { useBackgroundContext } from '../contexts';

const useStyles = makeStyles({
  card: {
    margin: 15
  }
});

const Parties = () => {
  const classes = useStyles();

  const backgroundService = useBackgroundContext();
  const [parties, setParties] = useState<GetPartiesResponse | undefined>(undefined);
  const [invitation, setInvitation] = useState('');
  const [passcode, setPasscode] = useState('');
  const [inProgress, setInProgress] = useState(false);

  useEffect(() => {
    if (backgroundService === undefined) {
      return;
    }

    setImmediate(async () => {
      setParties(await backgroundService.rpc.GetParties({}))
    });
  }, [backgroundService]);

  if (!backgroundService) {
    return <p>Connecting to background...</p>;
  }

  const handleJoin = async () => {
    try {
      setInProgress(true);
      console.log('joining...')
      await backgroundService.rpc.JoinParty({
        invitation,
        passcode
      })
      console.log('getting parties after join...')
      setParties(await backgroundService.rpc.GetParties({}))
    } catch (e) {
      console.error(e);
    } finally {
      setInvitation('')
      setPasscode('')
      setInProgress(false);
    }
  }

  return (
    <Card className={classes.card} raised={true}>
      <CardContent> 
        <p>You have {parties?.partyKeys?.length ?? 0} parties.</p>

        <TextField placeholder={'Invitation'} value={invitation} onChange={event => setInvitation(event.target.value)} />
        <TextField placeholder={'Passcode'} value={passcode} onChange={event => setPasscode(event.target.value)} />
        <Button disabled={!invitation || !passcode || inProgress} onClick={handleJoin}>{inProgress ? 'Joining...' : 'Join Party'}</Button>
      </CardContent>
    </Card>
  );
}

export default Parties;
