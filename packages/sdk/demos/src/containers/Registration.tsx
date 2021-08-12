//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Dialog, DialogContent, DialogContentText, LinearProgress } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import RestoreIcon from '@material-ui/icons/Restore';

import { sleep } from '@dxos/async';
import { keyPairFromSeedPhrase } from '@dxos/credentials';
import { useClient } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-ux';

import DialogHeading from '../components/DialogHeading';
import RegistrationDialog from '../components/RegistrationDialog';

const useStyles = makeStyles((theme) => ({
  progressBar: {
    marginBottom: theme.spacing(2)
  }
}));

const Registration = () => {
  const classes = useStyles();

  const client = useClient();
  const [recovering, setRecovering] = useState(false);

  const handleFinishCreate = async (username: string, seedPhrase: string) => {
    const identityKeyPair = keyPairFromSeedPhrase(seedPhrase);
    await client.halo.createProfile({ ...identityKeyPair, username });
  };

  const handleFinishRestore = async (seedPhrase: string) => {
    setRecovering(true);

    // TODO(rzadp): Recovering halo requires another device to be online.
    // No point in having real recovering in storybook as long as we don't have device initiations as well.
    await sleep(2000); // Simulate recovering.
    // await client.echo.halo.recover(seedPhrase);

    await client.halo.createProfile(keyPairFromSeedPhrase(seedPhrase)); // We don't have device recovery, so just recreating halo from scratch.

    setRecovering(false);
  };

  const keyringDecrypter = () => {
    throw new Error('Keyring decrypted not implemented.');
  };

  return (
    <FullScreen>
      <RegistrationDialog
        keyringDecrypter={keyringDecrypter as any}
        open={true}
        debug={true}
        onFinishCreate={handleFinishCreate}
        onFinishRestore={handleFinishRestore}
      />
      {recovering && (
        <Dialog open maxWidth='sm'>
          <DialogHeading title='Recovering wallet' icon={RestoreIcon}/>
          <DialogContent>
            <LinearProgress className={classes.progressBar} />
            <DialogContentText>One of your other devices needs to be online.</DialogContentText>
          </DialogContent>
        </Dialog>
      )}
    </FullScreen>
  );
};

export default Registration;
