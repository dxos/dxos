//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { GraphBuilder, Node } from '@dxos/app-graph';
import { Annotation, Filter, Key, Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';

import { Paths } from '../app';
import { AppCapabilities } from '../app-framework';
import { AppNodeMatcher } from '../app-graph';
import { AppNode } from '../app-graph';

/**
 * Creates a graph extension that surfaces all objects of an ECHO type under
 * each space as a dedicated sidebar section.
 *
 * The section id, type, plural label, and icon are all derived from the schema's
 * typename and annotations — no manual wiring needed. The section is suppressed
 * when the space has no matching objects.
 *
 * Requires five coordinated pieces: Paths.createTypeSectionPaths, the section
 * extension (this function), a {@link SpaceCapabilities.CreateObjectEntry} with
 * `targetNodeId: options.targetNodeId ?? getSectionPath(spaceId)` (the ?? fallback ensures
 * both the section "+" button and the space-level create dialog navigate to the section path),
 * a section action that passes `targetNodeId`, and a {@link createTypeSectionPathResolver}
 * registered via {@link AppCapabilities.NavigationPathResolver} for deep-link support.
 *
 * // TODO(wittjosiah): Simplify this idiom — five coordinated pieces across multiple files is a high bar.
 *
 * @idiom org.dxos.app-toolkit.typeSection
 *   applies: Dedicated sidebar sections that list objects of a single ECHO type under a space
 *   instead-of: Only surfacing the type in plugin-space's generic database subtree, which buries it and reduces discoverability for the app user
 *   uses: {@link createTypeSectionExtension}, {@link Paths.createTypeSectionPaths}, {@link createTypeSectionPathResolver}, {@link AppNodeMatcher.whenSpace}, {@link Filter.type}, {@link AppNode.makeObject}
 */
export const createTypeSectionExtension = (
  type: Type.AnyEntity,
  options?: {
    /** Position hint for the section in the sidebar. */
    position?: 'first' | 'last';
    /**
     * Override the default `Filter.type(type)` query.
     * Use to narrow or exclude objects (e.g. `Query.without` to hide companion-linked chats).
     */
    query?: Query.Any;
  },
): Effect.Effect<GraphBuilder.BuilderExtension[], never, never> => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create a type section extension.');

  // Filter.type's overload constraint (UnknownTypeSchema) is not publicly exported;
  // the runtime accepts any schema with a typename annotation.
  const filter = Filter.type(type as any) as Filter.Any;
  const defaultQuery = Query.select(filter);
  const testId = `${typename}.section`;

  const label = AppNode.getDynamicLabel('typename.label', typename, { count: 2 });

  return GraphBuilder.createExtension({
    id: typename,
    match: AppNodeMatcher.whenSpace,
    connector: (space, get) => {
      const objects = get(space.db.query(options?.query ?? defaultQuery).atom) as Obj.Unknown[];
      if (objects.length === 0) {
        return Effect.succeed([]);
      }

      // Mirror AppNode.makeObject: look up the registered Type.Type entity to read icon/hue.
      // Raw schema classes don't carry annotations reliably; the registry copy does.
      const typeEntity = space.db.graph.registry
        .list()
        .filter(Type.isType)
        .find((entry) => Type.getTypename(entry) === typename);
      const registeredSchema = typeEntity ? Type.getSchema(typeEntity) : undefined;
      const annotation = (() => {
        try {
          return registeredSchema ? Option.getOrUndefined(Annotation.IconAnnotation.get(registeredSchema)) : undefined;
        } catch {
          return undefined;
        }
      })();
      const icon = annotation?.icon ?? 'ph--circle-dashed--regular';
      const iconHue = annotation?.hue;

      return Effect.succeed([
        Node.make({
          id: typename,
          type: typename,
          data: `${typename}-root`,
          properties: {
            label,
            icon,
            ...(iconHue ? { iconHue } : {}),
            role: 'branch',
            space,
            testId,
            ...(options?.position ? { position: options.position } : {}),
          },
          nodes: objects
            .map((object) => AppNode.makeObject({ get, db: space.db, object }))
            .filter((node): node is NonNullable<typeof node> => node !== null),
        }),
      ]);
    },
  });
};

/**
 * Creates a `AppCapabilities.NavigationPathResolver` that recognises paths of the form
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
 *   applies: Plugins that expose a type section via {@link createTypeSectionExtension} and need navigation to the type section instead of falling back to the generic database section.
 *   instead-of: Navigating to the database section after object creation, or getting a 404 on deep-link and page reload before the graph has populated.
 *   uses: {@link createTypeSectionPathResolver}, {@link AppCapabilities.NavigationPathResolver}, {@link Paths.createTypeSectionPaths}, {@link createTypeSectionExtension}
 */
export const createTypeSectionPathResolver = (type: Type.AnyEntity): AppCapabilities.NavigationPathResolver => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create a type section path resolver.');
  return (qualifiedPath) => {
    const spaceId = Paths.getSpaceIdFromPath(qualifiedPath);
    if (!spaceId) {
      return Effect.succeed(Option.none());
    }

    const sectionPath = `${Paths.getSpacePath(spaceId)}/${typename}`;
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
