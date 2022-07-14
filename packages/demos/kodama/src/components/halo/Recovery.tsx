//
// Copyright 2022 DXOS.org
//

import TextInput from 'ink-text-input';
import React, { useState } from 'react';

export const Recovery = () => {
  const [seedPhrase, setSeedPhrase] = useState<string>();

  // TODO(burdon): Recovery process.
  const handleSubmit = () => {};

  return (
    <TextInput
      value={seedPhrase ?? ''}
      onChange={setSeedPhrase}
      onSubmit={handleSubmit}
      placeholder='Seed phrase'
    />
  );
};
