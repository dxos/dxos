//
// Copyright 2021 DXOS.org
//

import { useState } from 'react';

import { trigger } from '@dxos/async';
import { generatePasscode } from '@dxos/credentials';

// TODO(burdon): Factor out; replaces useInvitation.
export const useSecretProvider = (): [() => Promise<Buffer>, string | undefined, () => void] => {
  const [pin, setPin] = useState<string>();

  const provider = () => {
    const pin = generatePasscode();
    setPin(pin);
    return Promise.resolve(Buffer.from(pin));
  };

  return [provider, pin, () => setPin('')];
};

// TODO(burdon): Factor out; replaces useInvitationRedeemer.
export const useProvider = <T extends any> (): [() => Promise<T>, (value: T) => void] => {
  const [[provider, resolver]] = useState(() => trigger<T>());

  return [provider, resolver];
};
