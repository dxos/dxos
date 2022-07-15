//
// Copyright 2022 DXOS.org
//

import TextInput from 'ink-text-input';
import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';

export const RecoverProfile = () => {
  const [seedPhrase, setSeedPhrase] = useState<string>();
  const client = useClient();

  const handleSubmit = async (keyPhrase: string) => {
    await client.halo.recoverProfile(keyPhrase);
  };

  return (
    <TextInput
      value={seedPhrase ?? ''}
      onChange={setSeedPhrase}
      onSubmit={handleSubmit}
      placeholder='Enter seed phrase'
    />
  );
};
