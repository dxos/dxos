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
 * Two things must work together for navigation to land in the custom section:
 *
 * 1. **Path resolver** (this helper) — maps `root/<spaceId>/<typename>/<objectId>` to an EID so
 *    `validateNavigationTarget` doesn't 404 before the graph has populated.
 *
 * 2. **CreateObjectEntry subject** — in each plugin's `CreateObjectEntry`, pass
 *    `targetNodeId: getSectionPath(options.db.spaceId)` to `SpaceOperation.AddObject`.
 *    The handler computes `subject = targetNodeId + "/" + objectId`, which is exactly the custom
 *    section path. `OpenCreateObject` navigates to `subject[0]` after creation, so this routes
 *    the create-dialog path to the section rather than the database subtree:
 *    ```ts
 *    createObject: (props, options) =>
 *      Effect.gen(function* () {
 *        const object = MyType.make(props);
 *        return yield* Operation.invoke(SpaceOperation.AddObject, {
 *          object,
 *          target: options.target,
 *          hidden: true,
 *          targetNodeId: options.targetNodeId ?? getSectionPath(options.db.spaceId),
 *        });
 *      }),
 *    ```
 *
 * @idiom org.dxos.app-toolkit.typeSectionPathResolver
 *   applies: Plugins that expose a type section via {@link createTypeSectionExtension} and need navigation — from direct invocation, deep-link, page reload, or the create dialog — to land in the custom section rather than the database subtree
 *   instead-of: Relying on the graph being fully populated before navigation, or accepting that the create dialog navigates to the database subtree
 *   uses: {@link createTypeSectionPathResolver}, {@link AppCapabilities.NavigationPathResolver}, {@link createTypeSectionPaths}, {@link createTypeSectionExtension}
 */
export const createTypeSectionPathResolver = (type: Type.Type): AppCapabilities.NavigationPathResolver => {
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
