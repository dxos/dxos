//
// Copyright 2021 DXOS.org
//

import { useState } from 'react';

import { generatePasscode } from '@dxos/credentials';

export const useSecretGenerator = (): [() => Promise<Buffer>, string | undefined, () => void] => {
  const [pin, setPin] = useState<string>();

  const provider = () => {
    const pin = generatePasscode();
    setPin(pin);
    return Promise.resolve(Buffer.from(pin));
  };

  return [provider, pin, () => setPin('')];
};
