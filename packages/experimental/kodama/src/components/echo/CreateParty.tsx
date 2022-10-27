//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useClient } from '@dxos/react-client';

import { TextInput } from '../../components';
import { Panel } from '../util';

export const CreateParty: FC<{
  onCreate: (partyKey: PublicKey) => void;
}> = ({ onCreate }) => {
  const client = useClient();
  const [name, setName] = useState<string>();
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (text: string) => {
    const name = text.trim();
    if (name.length) {
      const party = await client.echo.createParty();
      // void party.setProperty('title', name);
      setName('');
      onCreate?.(party.key);
    }
  };

  return (
    <Panel highlight={focused}>
      <TextInput
        value={name ?? ''}
        onChange={setName}
        onSubmit={handleSubmit}
        onFocus={setFocused}
        placeholder='Enter party name.'
      />
    </Panel>
  );
};
