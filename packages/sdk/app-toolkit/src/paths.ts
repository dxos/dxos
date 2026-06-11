//
// Copyright 2025 DXOS.org
//

import { Node } from '@dxos/app-graph';
import { Key, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

/**
 * Prefix for pinned (non-space) workspace IDs in the graph.
 */
const PINNED_WORKSPACE_PREFIX = '!';

/**
 * Build a pinned workspace segment ID.
 */
export const pinnedWorkspaceId = (name: string): string => `${PINNED_WORKSPACE_PREFIX}${name}`;

/**
 * Build a qualified path to a pinned workspace.
 */
export const getPinnedWorkspacePath = (name: string): string => `${Node.RootId}/${pinnedWorkspaceId(name)}`;

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
 * Well-known local segment name for the per-space virtual Home node.
 */
export const SPACE_HOME_SEGMENT = 'home';

/**
 * Canonical qualified path to the virtual Home node of a space.
 */
export const getSpaceHomePath = (spaceId: string): string => `${getSpacePath(spaceId)}/${SPACE_HOME_SEGMENT}`;

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
 * Canonical qualified path to the custom type section node directly under a space.
 * This is the path used by sections created with {@link createTypeSectionExtension}.
 * Distinct from {@link getTypePath} which navigates to the plugin-space database subtree.
 */
const getTypeSectionPath = (spaceId: string, typename: string): string => `${getSpacePath(spaceId)}/${typename}`;

/**
 * Canonical qualified path to a specific object within a custom type section.
 * Use this instead of {@link getObjectPath} when navigating to objects surfaced by
 * {@link createTypeSectionExtension}, so navigation lands in the custom section rather
 * than the database subtree.
 */
const getTypeSectionObjectPath = (spaceId: string, typename: string, objectId: string): string =>
  `${getSpacePath(spaceId)}/${typename}/${objectId}`;

/**
 * Creates strongly-typed path helpers for a plugin's custom type section.
 *
 * Pass an ECHO schema; the typename is derived once and captured in the returned helpers.
 * Plugins destructure and re-export under their own names:
 *
 * ```ts
 * const { getSectionPath: getChatsPath, getObjectPath: getChatPath } =
 *   createTypeSectionPaths(Chat.Chat);
 * export { getChatsPath, getChatPath };
 * ```
 *
 * @idiom org.dxos.app-toolkit.typeSectionPath
 *   applies: Navigating to or linking to objects of a plugin-specific ECHO type
 *   instead-of: Building path strings with template literals at the call site
 *   uses: {@link createTypeSectionPaths}
 */
export const createTypeSectionPaths = (type: Type.AnyEntity) => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create type section paths.');
  return {
    /** Canonical qualified path to the type's section node within a space. */
    getSectionPath: (spaceId: string): string => getTypeSectionPath(spaceId, typename),
    /** Canonical qualified path to a specific object within the type's section. */
    getObjectPath: (spaceId: string, objectId: string): string => getTypeSectionObjectPath(spaceId, typename, objectId),
  };
};

/**
 * Check whether a qualified workspace path represents a pinned (non-space) workspace.
 * Pinned workspaces have a `!`-prefixed segment immediately after `root/`.
 */
export const isPinnedWorkspace = (qualifiedPath: string): boolean =>
  qualifiedPath.startsWith(`${Node.RootId}/${PINNED_WORKSPACE_PREFIX}`);

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
