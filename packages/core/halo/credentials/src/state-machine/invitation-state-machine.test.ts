//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { beforeEach, describe, expect, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromDate, fromPublicKey } from '@dxos/protocols/buf';
import { Invitation_AuthMethod } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type Credential, SpaceMember_Role, SpaceMemberSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import {
  CancelDelegatedInvitationSchema,
  type DelegateSpaceInvitation,
  DelegateSpaceInvitationSchema,
} from '@dxos/protocols/buf/dxos/halo/invitations_pb';
import { range } from '@dxos/util';

import {
  createCredential,
  createCredentialSignerWithKey,
  createDelegatedSpaceInvitationCredential,
  credentialIdOf,
  credentialOfPayload,
} from '../credentials/index.ts';
import { InvitationStateMachine } from './invitation-state-machine.ts';

describe('InvitationStateMachine', () => {
  const keyring = new Keyring();
  let space: PublicKey;
  let identity: PublicKey;
  const baseInvitation: DelegateSpaceInvitation = create(DelegateSpaceInvitationSchema, {
    invitationId: PublicKey.random().toHex(),
    swarmKey: fromPublicKey(PublicKey.random()),
    role: SpaceMember_Role.ADMIN,
    authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
    multiUse: false,
  });

  beforeEach(async () => {
    space = await keyring.createKey();
    identity = await keyring.createKey();
  });

  test('invitation delegated', async () => {
    const stateMachine = new InvitationStateMachine();
    await stateMachine.process(await delegateInvitation(baseInvitation));
    expectHasInvitation(stateMachine, baseInvitation);
  });

  test('multiple invitations', async () => {
    const stateMachine = new InvitationStateMachine();
    const invitations = range(3, () =>
      create(DelegateSpaceInvitationSchema, { ...baseInvitation, invitationId: PublicKey.random().toHex() }),
    );
    await Promise.all(
      invitations.map(async (invitation) => {
        return stateMachine.process(await delegateInvitation(invitation));
      }),
    );
    invitations.forEach((invitation) => expectHasInvitation(stateMachine, invitation));
  });

  test('expired invitations are ignored', async () => {
    const stateMachine = new InvitationStateMachine();
    await stateMachine.process(
      await delegateInvitation(
        create(DelegateSpaceInvitationSchema, { ...baseInvitation, expiresOn: fromDate(new Date(Date.now() - 1)) }),
      ),
    );
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('single use invitation redeemed when a member joins', async () => {
    const stateMachine = new InvitationStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(delegatedInvitation);
    await stateMachine.process(await admitMember(delegatedInvitation));
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('invitation stays if unrelated admission credential', async () => {
    const stateMachine = new InvitationStateMachine();
    const unrelatedInvitation = await delegateInvitation(
      create(DelegateSpaceInvitationSchema, { ...baseInvitation, invitationId: PublicKey.random().toHex() }),
    );
    await stateMachine.process(await delegateInvitation(baseInvitation));
    await stateMachine.process(await admitMember(unrelatedInvitation));
    expectHasInvitation(stateMachine, baseInvitation);
  });

  test('multi-use invitations', async () => {
    const stateMachine = new InvitationStateMachine();
    const multiUseInvitation = create(DelegateSpaceInvitationSchema, { ...baseInvitation, multiUse: true });
    const delegatedInvitation = await delegateInvitation(multiUseInvitation);
    await stateMachine.process(delegatedInvitation);
    await stateMachine.process(await admitMember(delegatedInvitation));
    await stateMachine.process(await admitMember(delegatedInvitation));
    expectHasInvitation(stateMachine, multiUseInvitation);
  });

  test('explicit cancellation', async () => {
    const stateMachine = new InvitationStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(delegatedInvitation);
    await stateMachine.process(await cancelInvitation(delegatedInvitation));
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('out of order joining', async () => {
    const stateMachine = new InvitationStateMachine();
    const delegatedInvitation = await delegateInvitation(baseInvitation);
    await stateMachine.process(await admitMember(delegatedInvitation));
    await stateMachine.process(delegatedInvitation);
    expectNoInvitation(stateMachine, baseInvitation);
  });

  test('out of order cancellation', async () => {
    const stateMachine = new InvitationStateMachine();
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
    return credentialOfPayload(message);
  };

  const cancelInvitation = async (invitation: Credential): Promise<Credential> => {
    return createCredential({
      issuer: space,
      subject: identity,
      assertion: create(CancelDelegatedInvitationSchema, { credentialId: fromPublicKey(credentialIdOf(invitation)) }),
      signer: keyring,
    });
  };

  const admitMember = (invitation: Credential) => {
    return createCredential({
      issuer: space,
      subject: identity,
      assertion: create(SpaceMemberSchema, {
        spaceKey: fromPublicKey(space),
        role: SpaceMember_Role.ADMIN,
        genesisFeedKey: fromPublicKey(PublicKey.random()),
        invitationCredentialId: invitation.id,
      }),
      signer: keyring,
    });
  };
});
