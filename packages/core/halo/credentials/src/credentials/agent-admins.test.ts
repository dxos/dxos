//
// Copyright 2026 DXOS.org
//

import { clone, fromBinary, toBinary } from '@bufbuild/protobuf';
import { describe, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createAgentAdminsCredential, verifyAgentAdmins } from './agent-admins.ts';
import { getCredentialAssertion } from './assertions.ts';
import { createCredentialSignerWithKey } from './credential-factory.ts';

const setup = async () => {
  const keyring = new Keyring();
  const agent = await keyring.createKey();
  return { keyring, agent, signer: createCredentialSignerWithKey(keyring, agent) };
};

describe('agent admins', () => {
  test('the agent signs its admins about itself, and the list survives the wire', async ({ expect }) => {
    const { agent, signer } = await setup();
    const alice = PublicKey.random();
    const bob = PublicKey.random();
    const credential = await createAgentAdminsCredential(signer, [alice, bob]);

    const received = fromBinary(CredentialSchema, toBinary(CredentialSchema, credential));
    expect(getCredentialAssertion(received).$typeName).toBe('dxos.halo.credentials.AgentAdmins');
    const result = await verifyAgentAdmins(received, agent);
    expect(result.kind).toBe('pass');
    if (result.kind === 'pass') {
      expect(result.admins.agentKey.equals(agent)).toBe(true);
      expect(result.admins.adminKeys.map((key) => key.toHex())).toEqual([alice.toHex(), bob.toHex()]);
    }
  });

  test('an agent with no admins left signs an empty list', async ({ expect }) => {
    const { agent, signer } = await setup();
    const credential = await createAgentAdminsCredential(signer, []);

    const result = await verifyAgentAdmins(fromBinary(CredentialSchema, toBinary(CredentialSchema, credential)), agent);
    expect(result.kind).toBe('pass');
    if (result.kind === 'pass') {
      expect(result.admins.adminKeys).toEqual([]);
    }
  });

  test('a list another identity signed does not name the agent’s admins', async ({ expect }) => {
    const { keyring, agent } = await setup();
    const other = await keyring.createKey();
    const credential = await createAgentAdminsCredential(createCredentialSignerWithKey(keyring, other), [
      PublicKey.random(),
    ]);

    const result = await verifyAgentAdmins(credential, agent);
    expect(result).toMatchObject({ kind: 'fail', reason: 'wrong-agent' });
  });

  test('a list changed after signing fails its signature', async ({ expect }) => {
    const { agent, signer } = await setup();
    const alice = PublicKey.random();
    const signed = await createAgentAdminsCredential(signer, [alice]);
    const widened = await createAgentAdminsCredential(signer, [alice, PublicKey.random()]);
    const forged = clone(CredentialSchema, signed);
    forged.subject = widened.subject;

    const result = await verifyAgentAdmins(forged, agent);
    expect(result).toMatchObject({ kind: 'fail', reason: 'invalid-signature' });
  });
});
