//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { Obj } from '@dxos/echo';
import { type PublicKey } from '@dxos/keys';

import { SpaceSchema } from '#types';

import { type SpaceOperationConfig } from '../operations/helpers.ts';

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

/** The URL key of the database subgraph, under which every ECHO object has a URL. */
export const DATABASE_KEY = 'db';

/**
 * Builds the object-link builder: a URL under the generic `db` key, which every ECHO object resolves through,
 * carrying the object's title for link previews; `undefined` for an object outside a space. No builder without a
 * public origin (a headless host not given `shareableLinkOrigin`), since a link to localhost reaches no one else.
 */
export const makeCreateObjectUrl = ({
  shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : undefined,
}: SpaceSchema.SpacePluginOptions): SpaceOperationConfig['createObjectUrl'] =>
  shareableLinkOrigin === undefined
    ? undefined
    : (object: Obj.Unknown): string | undefined => {
        const spaceId = Obj.getDatabase(object)?.spaceId;
        if (!spaceId) {
          return undefined;
        }
        const id = [GraphPath.getTypeSlugFromUri(Obj.getTypeURI(object)), object.id].join(UrlPath.TAIL_SEPARATOR);
        const pathname = UrlPath.format({
          workspace: spaceId,
          workspaceKey: UrlPath.WORKSPACE_KEY,
          pairs: [{ key: DATABASE_KEY, id, workspace: spaceId }],
        });
        return UrlPath.withTitle(new URL(pathname, shareableLinkOrigin), Obj.getLabel(object)).toString();
      };
