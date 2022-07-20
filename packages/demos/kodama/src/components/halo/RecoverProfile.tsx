//
// Copyright 2022 DXOS.org
//

import { useFocus } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';

import { useClient } from '@dxos/react-client';

import { Panel } from '../util';

export const RecoverProfile = () => {
  const [seedPhrase, setSeedPhrase] = useState<string>();
  const { isFocused } = useFocus();
  const client = useClient();

  const handleSubmit = async (seedPhrase: string) => {
    await client.halo.recoverProfile(seedPhrase);
  };

  return (
    <Panel focused={isFocused}>
      <TextInput
        value={seedPhrase ?? ''}
        onChange={setSeedPhrase}
        onSubmit={handleSubmit}
        placeholder='Enter seed phrase'
      />
    </Panel>
  );
};
