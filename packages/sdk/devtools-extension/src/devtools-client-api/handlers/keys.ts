//
// Copyright 2020 DXOS.org
//

import { HandlerProps } from './handler-props';

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('party.keys', async ({ data: { topic } }) => {
    console.warn('Party keys not currently implemented.');
    return [];
  });

  bridge.onMessage('keyring.keys', () => {
    try {
      const { keyring } = hook;

      return keyring.keys
        .map(({ type, publicKey, added, own, trusted }) => ({
          type, publicKey: publicKey.toHex(), added, own, trusted
        }));
    } catch (e) {
      console.error('DXOS DevTools: keyring handler failed to respond');
      console.log(e);
    }
  });
};
