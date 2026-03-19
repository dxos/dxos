//
// Copyright 2025 DXOS.org
//

import { Node } from '@dxos/app-graph';
import { Key, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

/**
 * Prefix for companion node segment IDs (e.g., `~settings`, `~comments`).
 * A segment starting with this prefix identifies a companion panel child of its parent node.
 */
export const COMPANION_PREFIX = ATTENDABLE_PATH_SEPARATOR;

/**
 * Extract the companion variant name from a qualified companion node ID.
 * Takes the last `/`-separated segment and strips the optional `~` prefix.
 */
export const getCompanionVariant = (qualifiedId: string): string => {
  const lastSegment = qualifiedId.split('/').pop() ?? '';
  return lastSegment.startsWith(COMPANION_PREFIX) ? lastSegment.slice(COMPANION_PREFIX.length) : lastSegment;
};

/**
 * Well-known local segment names for the canonical graph tree structure.
 */
export const Segments = {
  types: 'types',
  collections: 'collections',
} as const;

/**
 * Canonical qualified path to a space node.
 */
export const getSpacePath = (spaceId: string): string => `${Node.RootId}/${spaceId}`;

/**
 * Extract the space ID segment from a qualified graph path.
 */
export const getSpaceIdFromPath = (qualifiedPath: string) => {
  return qualifiedPath.split('/').find((segment) => Key.SpaceId.isValid(segment)) as Key.SpaceId | undefined;
};

/**
 * Canonical qualified path to the types section of a space.
 */
export const getTypesPath = (spaceId: string): string => `${Node.RootId}/${spaceId}/${Segments.types}`;

/**
 * Canonical qualified path to a specific type's subtree within a space.
 * Optional additional segments are appended (e.g. an object id for a view under that type).
 */
export const getTypePath = (spaceId: string, typename: string, ...segments: string[]): string => {
  const base = `${Node.RootId}/${spaceId}/${Segments.types}/${typename}`;
  return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
};

/**
 * Canonical qualified path to a specific object node within a type's subtree.
 * Uses the ECHO-local object ID, not the full DXN.
 */
export const getObjectPath = (spaceId: string, typename: string, objectId: string): string =>
  `${Node.RootId}/${spaceId}/${Segments.types}/${typename}/all/${objectId}`;

/**
 * Derive the canonical graph path for a reactive ECHO object.
 * Throws if the object has no database or typename.
 */
export const getObjectPathFromObject = (object: Obj.Unknown): string => {
  const db = Obj.getDatabase(object);
  const typename = Obj.getTypename(object);
  invariant(db && typename, 'Cannot derive graph path: object has no database or typename.');
  return getObjectPath(db.spaceId, typename, object.id);
};

/**
 * Canonical qualified path to the collections section of a space.
 * Optional additional segments are appended (e.g. an object id for a collection under that section).
 */
export const getCollectionsPath = (spaceId: string, ...segments: string[]): string => {
  const base = `${Node.RootId}/${spaceId}/${Segments.collections}`;
  return segments.length > 0 ? `${base}/${segments.join('/')}` : base;
};

/**
 * Qualified path to a child object within a collection node.
 * Appends the object ID to the collection's qualified path.
 */
export const getCollectionObjectPath = (collectionQualifiedId: string, objectId: string): string =>
  `${collectionQualifiedId}/${objectId}`;

//
// URL routing helpers.
// These are the only supported way to translate between browser pathnames and qualified graph IDs.
//

/**
 * Convert a qualified graph ID to a browser URL pathname by stripping the leading `root` segment.
 * Segment content (including `!`, `~`, `:`, etc.) is preserved verbatim.
 */
export const toUrlPath = (qualifiedId: string): string => {
  if (qualifiedId === Node.RootId) {
    return '/';
  }
  if (qualifiedId.startsWith(`${Node.RootId}/`)) {
    return `/${qualifiedId.slice(Node.RootId.length + 1)}`;
  }
  return `/${qualifiedId}`;
};

/**
 * Restore a browser URL pathname to a qualified graph ID by prepending the `root` segment.
 */
export const fromUrlPath = (pathname: string): string => {
  const trimmed = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!trimmed) {
    return Node.RootId;
  }
  return `${Node.RootId}/${trimmed}`;
};

/**
 * Check whether a qualified workspace path represents a pinned (non-space) workspace.
 * Pinned workspaces have a `!`-prefixed segment immediately after `root/`.
 */
export const isPinnedWorkspace = (qualifiedPath: string): boolean => qualifiedPath.startsWith(`${Node.RootId}/!`);

/**
 * Derive the workspace qualified path from any qualified graph ID.
 * The workspace is the first two segments: `root/<workspace>`.
 * Returns `Node.RootId` if the path has no workspace segment.
 */
export const getWorkspaceFromPath = (qualifiedId: string): string => {
  const firstSep = qualifiedId.indexOf('/');
  if (firstSep === -1) {
    return Node.RootId;
  }
  const secondSep = qualifiedId.indexOf('/', firstSep + 1);
  if (secondSep === -1) {
    return qualifiedId;
  }
  return qualifiedId.slice(0, secondSep);
};
