//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';

import { Status, TextInput } from '../../components';
import { Panel } from '../util';

export const RecoverProfile = () => {
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>();
  const [[processing, error], setStatus] = useState<[boolean, Error | undefined]>([false, undefined]);
  const [focused, setFocused] = useState(false);
  const client = useClient();

  const handleSubmit = async (keyPhrase: string) => {
    try {
      setStatus([true, undefined]);
      // TODO(burdon): Validate keyPrase is well-formed.
      await client.halo.recoverProfile(keyPhrase);
      setStatus([false, undefined]);
    } catch (err) {
      // TODO(burdon): Error object is not well-formed (type Error, no name, message props).
      setStatus([false, new Error('Recovery failed.')]);
    }
  };

  return (
    <Panel highlight={focused}>
      <TextInput
        focus={!processing}
        value={recoveryPhrase ?? ''}
        onChange={setRecoveryPhrase}
        onSubmit={handleSubmit}
        onFocus={setFocused}
        placeholder='Enter recovery phrase.'
      />

      <Status
        error={error}
        processing={processing ? 'Authenticating' : undefined}
        marginTop={1}
      />
    </Panel>
  );
};
