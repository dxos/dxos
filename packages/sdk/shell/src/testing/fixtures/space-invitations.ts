//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type SpaceInvitationEntry } from '../../components/SpaceInvitationList/index.ts';
import { createContactFixtures } from './contacts.ts';

/**
 * Pending space invitations from fake contacts, sent at staggered times, for stories and tests.
 */
export const createSpaceInvitationFixtures = (now = Date.now()): SpaceInvitationEntry[] => {
  const { contacts } = createContactFixtures();
  const roles = [SpaceMember_Role.EDITOR, SpaceMember_Role.ADMIN, SpaceMember_Role.READER];
  return contacts.slice(0, 3).map((sender, index) => ({
    id: PublicKey.random().toHex(),
    sender,
    spaceKey: PublicKey.random(),
    spaceName: index === 0 ? 'Launch plan' : undefined,
    role: roles[index],
    sentAt: new Date(now - (index + 1) * 47 * 60_000),
  }));
};
