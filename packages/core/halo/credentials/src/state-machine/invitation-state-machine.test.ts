//
// Copyright 2022 DXOS.org
//

import { beforeEach, describe, expect, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type Credential, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DelegateSpaceInvitation } from '@dxos/protocols/proto/dxos/halo/invitations';
import { range } from '@dxos/util';

import {
  createCredential,
  createCredentialSignerWithKey,
  createDelegatedSpaceInvitationCredential,
} from '../credentials';

import { InvitationStateMachine } from './invitation-state-machine';

describe('InvitationStateMachine', () => {
  const keyring = new Keyring();
  let space: PublicKey;
  let identity: PublicKey;
  const baseInvitation: DelegateSpaceInvitation = {
    invitationId: PublicKey.random().toHex(),
    swarmKey: PublicKey.random(),
    role: SpaceMember.Role.ADMIN,
    authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
    multiUse: false,
  };

  beforeEach(async () => {
    space = await keyring.createKey();
    identity = await keyring.createKey();
  });

  test('invitation delegated', async () => {
    const stateMachine = createStateMachine();
    await stateMachine.process(await delegateInvitation(baseInvitation));
    expectHasInvitation(stateMachine, baseInvitation);
  });

  test('multiple invitations', async () => {
    const stateMachine = createStateMachine();
    const invitations = range(3, () => ({ ...baseInvitation, invitationId: PublicKey.random().toHex() }));
    await Promise.all(
      invitations.map(async (invitation) => stateMachine.process(await delegateInvitation(invitation))),
    );
    invitations.forEach((invitation) => expectHasInvitation(stateMachine, invitation));
  });

  test('expired invitations are ignored', async () => {
    const stateMachine = createStateMachine();
    await stateMachine.process(
      await delegateInvitation({
        ...baseInvitation,
        expiresOn: new Date(Date.now() - 1),
      }),
    );
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('single use invitation redeemed when a member joins', async () => {
    const stateMachine = createStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(delegatedInvitation);
    await stateMachine.process(await admitMember(delegatedInvitation));
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('invitation stays if unrelated admission credential', async () => {
    const stateMachine = createStateMachine();
    const unrelatedInvitation = await delegateInvitation({
      ...baseInvitation,
      invitationId: PublicKey.random().toHex(),
    });
    await stateMachine.process(await delegateInvitation(baseInvitation));
    await stateMachine.process(await admitMember(unrelatedInvitation));
    expectHasInvitation(stateMachine, baseInvitation);
  });

  test('multi-use invitations', async () => {
    const stateMachine = createStateMachine();
    const multiUseInvitation = { ...baseInvitation, multiUse: true };
    const delegatedInvitation = await delegateInvitation(multiUseInvitation);
    await stateMachine.process(delegatedInvitation);
    await stateMachine.process(await admitMember(delegatedInvitation));
    await stateMachine.process(await admitMember(delegatedInvitation));
    expectHasInvitation(stateMachine, multiUseInvitation);
  });

  test('explicit cancellation', async () => {
    const stateMachine = createStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(delegatedInvitation);
    await stateMachine.process(await cancelInvitation(delegatedInvitation));
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('out of order joining', async () => {
    const stateMachine = createStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(await admitMember(delegatedInvitation));
    await stateMachine.process(delegatedInvitation);
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('out of order cancellation', async () => {
    const stateMachine = createStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(await cancelInvitation(delegatedInvitation));
    await stateMachine.process(delegatedInvitation);
    expectNoInvitation(stateMachine, baseInvitation);
  });

  const expectHasInvitation = (state: InvitationStateMachine, expected: DelegateSpaceInvitation) => {
    const actual = [...state.invitations.values()].find((i) => i.invitationId === expected.invitationId);
    expect(actual).to.deep.contain(expected);
  };

  const expectNoInvitation = (state: InvitationStateMachine, expected: DelegateSpaceInvitation) => {
    const actual = [...state.invitations.values()].find((i) => i.invitationId === expected.invitationId);
    expect(actual).to.be.undefined;
  };

  const delegateInvitation = async (invitation: DelegateSpaceInvitation): Promise<Credential> => {
    const message = await createDelegatedSpaceInvitationCredential(
      createCredentialSignerWithKey(keyring, identity),
      space,
      invitation,
    );
    return message.credential!.credential;
  };

  const cancelInvitation = async (invitation: Credential): Promise<Credential> =>
    createCredential({
      issuer: space,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.invitations.CancelDelegatedInvitation',
        credentialId: invitation.id!,
      },
      signer: keyring,
    });

  const admitMember = (invitation: Credential) =>
    createCredential({
      issuer: space,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey: space,
        role: SpaceMember.Role.ADMIN,
        genesisFeedKey: PublicKey.random(),
        invitationCredentialId: invitation.id,
      },
      signer: keyring,
    });
});

const createStateMachine = () => new InvitationStateMachine();
