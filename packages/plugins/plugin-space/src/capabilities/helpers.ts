//
// Copyright 2025 DXOS.org
//

import { type SpacePluginOptions } from '#types';

/** Builds the invitation-link URL builder shared by the props mappings below. */
export const makeCreateInvitationUrl =
  ({
    shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    invitationPath = '/',
    invitationProp = 'spaceInvitationCode',
  }: SpacePluginOptions) =>
  (invitationCode: string) => {
    const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
    baseUrl.searchParams.set(invitationProp, invitationCode);
    return baseUrl.toString();
  };
