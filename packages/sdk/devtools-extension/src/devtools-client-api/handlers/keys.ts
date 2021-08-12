//
// Copyright 2020 DXOS.org
//

import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { HandlerProps } from "./handler-props";

export default ({ hook, bridge }: HandlerProps) => {
  bridge.onMessage('party.keys', async ({ data: { topic } }) => {
    try {
      const { keyring, client } = hook;

      // For some reason the check under getParty throws.
      // const party = partyManager.getParty(Buffer.from(topic, 'hex'))
      console.log('topic', topic);
      const partyKey = PublicKey.from(topic);
      const isHalo = keyring.hasKey(partyKey) && keyring.getKey(partyKey).type === KeyType.IDENTITY;

      // TODO(telackey): Don't access private members.
      const party = isHalo ? client.echo._identityManager.halo._party : client.echo.getParty(partyKey)?._internal;
      if (!party) {
        console.error('DXOS DevTools: Party not found');
        return [];
      }

      // TODO(telackey): Don't access private members.
      const partyKeys = party._partyProcessor._stateMachine._keyring.findKeys();
      return partyKeys
        .map(({ type, publicKey, added, trusted }) => {
          const localKey = keyring.getKey(publicKey);
          const own = localKey && localKey.own;
          return { type, publicKey: publicKey.toHex(), added, own, trusted };
        });
    } catch (e) {
      console.error('DXOS DevTools: party keys handler failed to respond');
      console.log(e);
    }
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
