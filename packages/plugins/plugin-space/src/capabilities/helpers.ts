//
// Copyright 2025 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

import { SpaceSchema } from '#types';

/** Builds the invitation-link URL builder shared by the props mappings below. */
export const makeCreateInvitationUrl =
  ({
    shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    invitationPath = '/',
    invitationProp = 'spaceInvitationCode',
  }: SpaceSchema.SpacePluginOptions) =>
  (invitationCode: string) => {
    const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
    baseUrl.searchParams.set(invitationProp, invitationCode);
    return baseUrl.toString();
  };

/** Builds the join-by-key URL builder for a space admitted contacts can open directly. */
export const makeCreateJoinUrl =
  ({
    shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    invitationPath = '/',
    joinSpaceKeyProp = 'spaceKey',
  }: SpaceSchema.SpacePluginOptions) =>
  (spaceKey: PublicKey) => {
    const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
    baseUrl.searchParams.set(joinSpaceKeyProp, spaceKey.toHex());
    return baseUrl.toString();
  };
