//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Key, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';

import { type AppCapabilities } from './capabilities';
import { getSpaceIdFromPath, getSpacePath } from './paths';

/**
 * Creates a `NavigationPathResolver` that recognises paths of the form
 * `root/<spaceId>/<typename>/<objectId>` and maps them to ECHO EIDs.
 *
 * Without a resolver, `validateNavigationTarget` returns NOT_FOUND for any path
 * not yet materialised in the graph — causing navigation to the custom type section
 * (including deep-links and page reloads) to silently 404.
 *
 * Register with `AppPlugin.addNavigationResolverModule`. One resolver per type is enough;
 * the capability system fans them out until one returns `Option.some`.
 *
 * Also set `targetNodeId: getSectionPath(options.db.spaceId)` in the plugin's `CreateObjectEntry`
 * so the create dialog navigates to the type section rather than the generic database section:
 * ```ts
 * targetNodeId: options.targetNodeId ?? getSectionPath(options.db.spaceId),
 * ```
 *
 * @idiom org.dxos.app-toolkit.typeSectionPathResolver
 *   applies: Plugins that expose a type section via {@link createTypeSectionExtension} and need navigation to the type section instead of falling back to the generic database section
 *   instead-of: Navigating to the database section after object creation, or getting a 404 on deep-link and page reload before the graph has populated
 *   uses: {@link createTypeSectionPathResolver}, {@link AppCapabilities.NavigationPathResolver}, {@link createTypeSectionPaths}, {@link createTypeSectionExtension}
 */
export const createTypeSectionPathResolver = (type: Type.AnyEntity): AppCapabilities.NavigationPathResolver => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create a type section path resolver.');
  return (qualifiedPath) => {
    const spaceId = getSpaceIdFromPath(qualifiedPath);
    if (!spaceId) {
      return Effect.succeed(Option.none());
    }

    const sectionPath = `${getSpacePath(spaceId)}/${typename}`;
    if (!qualifiedPath.startsWith(`${sectionPath}/`)) {
      return Effect.succeed(Option.none());
    }

    // The immediate segment after the section path is the object ID.
    const objectId = qualifiedPath.slice(sectionPath.length + 1).split('/')[0];
    if (!objectId || !Key.EntityId.isValid(objectId)) {
      return Effect.succeed(Option.none());
    }

    return Effect.succeed(Option.some(EID.make({ spaceId, entityId: objectId as Key.EntityId })));
  };
};
