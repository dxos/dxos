//
// Copyright 2025 DXOS.org
//

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
