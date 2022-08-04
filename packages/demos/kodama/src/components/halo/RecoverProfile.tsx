//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';

import { Status, StatusState, TextInput } from '../../components';
import { Panel } from '../util';

export const RecoverProfile = () => {
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>();
  const [status, setStatus] = useState<StatusState>();
  const [focused, setFocused] = useState(false);
  const client = useClient();

  const handleSubmit = async (keyPhrase: string) => {
    try {
      setStatus({ processing: 'Recovering HALO...' });
      // TODO(burdon): Validate keyPrase is well-formed.
      await client.halo.recoverProfile(keyPhrase);
      setStatus({ success: 'OK' });
    } catch (err) {
      // TODO(burdon): Error object is not well-formed (type Error, no name, message props).
      setStatus({ error: new Error('Recovery failed.') });
    }
  };

  return (
    <Panel highlight={focused}>
      <TextInput
        focus={!status?.processing}
        value={recoveryPhrase ?? ''}
        onChange={setRecoveryPhrase}
        onSubmit={handleSubmit}
        onFocus={setFocused}
        placeholder='Enter recovery phrase.'
      />

      <Status
        status={status}
        marginTop={1}
      />
    </Panel>
  );
};
