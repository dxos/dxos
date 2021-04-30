//
// Copyright 2019 DXOS.org
//

// dxos-testing-browser

import debug from 'debug';
import waitForExpect from 'wait-for-expect';

import { randomBytes } from '@dxos/crypto';

import { createGreetingClaimMessage } from '../greet';
import { PartyInvitationClaimHandler } from '../greet/party-invitation-claim-handler';
import { Filter, Keyring } from '../keys';
import { KeyType } from '../proto';
import { Party } from './party';
import {
  createKeyAdmitMessage, createPartyGenesisMessage,
  createPartyInvitationMessage, createEnvelopeMessage
} from './party-credential';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const log = debug('dxos:creds:party:test');

const createPartyKeyrings = async () => {
  // This Keyring has all the keypairs, so it is the initial source of things.
  const keyring = new Keyring();
  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      await keyring.createKeyRecord({ type: KeyType[type] });
    }
  }

  const partyKey = keyring.findKey(Filter.matches({ type: KeyType.PARTY }));
  const identityKey = keyring.findKey(Filter.matches({ type: KeyType.IDENTITY }));
  const deviceKey = keyring.findKey(Filter.matches({ type: KeyType.DEVICE }));
  const feedKey = keyring.findKey(Filter.matches({ type: KeyType.FEED }));

  return {
    keyring,
    identityKey,
    deviceKey,
    feedKey,
    partyKey
  };
};

test('PartyInvitation messages', async () => {
  const rendezvousKey = randomBytes();
  const { keyring, partyKey, identityKey, feedKey } = await createPartyKeyrings();
  const { keyring: inviteeKeyring, identityKey: inviteeKey } = await createPartyKeyrings();
  const party = new Party(partyKey.publicKey);

  // First, configure the Party.
  const genesisMessage = createPartyGenesisMessage(keyring, partyKey, feedKey, identityKey);
  await party.processMessages([genesisMessage]);

  // Now 'write' an invitation message.
  const invitationMessage = createPartyInvitationMessage(keyring, partyKey.publicKey, inviteeKey.publicKey, identityKey);
  await party.processMessages([invitationMessage]);

  const invitationID = invitationMessage.payload.signed.payload.id;

  const greetingHandler = jest.fn((claimInvitationID) => {
    expect(claimInvitationID).toEqual(invitationID);
    return { invitation: randomBytes(), swarmKey: rendezvousKey };
  });

  const claimHandler = new PartyInvitationClaimHandler(greetingHandler);
  expect(party.getInvitation(invitationID)).toBeTruthy();

  // "Send" the Claim message.
  const claimMessage = createGreetingClaimMessage(invitationID);
  const claimResponse = await claimHandler.handleMessage(claimMessage, randomBytes(), randomBytes());

  const admitMessage = createKeyAdmitMessage(inviteeKeyring, partyKey.publicKey, inviteeKey, [inviteeKey]);
  const envelope = createEnvelopeMessage(keyring, partyKey.publicKey, admitMessage, [identityKey]);
  await party.processMessages([envelope]);

  expect(greetingHandler).toHaveBeenCalledTimes(1);
  expect(claimResponse.rendezvousKey).toEqual(rendezvousKey);

  await waitForExpect(() => {
    expect(party.isMemberKey(inviteeKey.publicKey)).toBe(true);
    expect(party.getInvitation(invitationID)).toBeUndefined();
  });
});
