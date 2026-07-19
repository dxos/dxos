//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { GraphBuilder, Node } from '@dxos/app-graph';
import { type Space, isSpace } from '@dxos/client/echo';
import { Annotation, Filter, Key, Obj, Query, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { type TreeData } from '@dxos/react-ui-list';
import { Position, inferObjectOrder } from '@dxos/util';

import { Paths } from '../app';
import { AppCapabilities } from '../app-framework';
import { AppNodeMatcher } from '../app-graph';
import { AppNode } from '../app-graph';
import { AppAnnotation } from '../echo';

/** Stable rearrange callback that persists section order via SectionOrderAnnotation on space.properties. */
export const makeSectionRearrangeCallback = AppNode.createFactory(
  (space: Space, typename: string) => (nextOrder: unknown[]) => {
    const refs = nextOrder.filter(Obj.isObject).map(Ref.make);
    if (Option.isNone(Annotation.get(space.properties, AppAnnotation.SectionOrderAnnotation))) {
      Obj.update(space.properties, (props) => {
        Annotation.set(props, AppAnnotation.SectionOrderAnnotation, { [typename]: refs });
      });
    } else {
      // Splice in place so only this type's array changes; Annotation.update validates the result.
      Annotation.update(space.properties, AppAnnotation.SectionOrderAnnotation, (order) => {
        if (order[typename]) {
          order[typename].splice(0, order[typename].length, ...refs);
        } else {
          order[typename] = refs;
        }
      });
    }
  },
  (space, typename) => `${typename}:${space.id}`,
);

/**
 * Creates a graph extension that surfaces all objects of an ECHO type under
 * each space as a dedicated sidebar section.
 *
 * The section id, type, plural label, and icon are all derived from the schema's
 * typename and annotations — no manual wiring needed. The section is suppressed
 * when the space has no matching objects.
 *
 * Requires four coordinated pieces: {@link Paths.createTypeSectionPaths}, this extension,
 * a {@link SpaceCapabilities.CreateObjectEntry} with
 * `targetNodeId: options.targetNodeId ?? getSectionPath(spaceId)`, and a
 * {@link createTypeSectionPathResolver} registered via {@link AppCapabilities.NavigationPathResolver}.
 *
 * Pass `createObject` to add a "+" action on the section header automatically.
 */
export const createTypeSectionExtension = (
  type: Type.AnyEntity,
  options?: {
    /** Position hint for the section in the sidebar. */
    position?: Position.Position;
    /**
     * Override the default `Filter.type(type)` query.
     * Use to narrow or exclude objects (e.g. `Query.without` to hide companion-linked chats).
     */
    query?: Query.Any;
    /**
     * Override the default {@link AppNodeMatcher.whenSpace} match function.
     * Use when the section should live under a group node rather than directly under a space.
     * The match must still return `Option<Space>` so the connector can query the space db.
     */
    match?: (node: Node.Node) => Option.Option<Space>;
    /**
     * If provided, a "+" action is added to the section header that runs this effect when clicked.
     * The action label is resolved from `add-object.label` in the type's i18n namespace.
     */
    createObject?: (space: Space) => Effect.Effect<any, any, any>;
    /**
     * Override the registered URL prefix key for this section's connector. Takes precedence over
     * {@link AppAnnotation.UrlPrefixAnnotation} on the schema — use when annotating the schema is
     * awkward (e.g. the schema lives in a package that cannot depend on `@dxos/app-toolkit`).
     */
    urlKey?: string;
  },
): Effect.Effect<GraphBuilder.BuilderExtension[], never, never> => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create a type section extension.');

  // Filter.type's overload constraint (UnknownTypeSchema) is not publicly exported;
  // the runtime accepts any schema with a typename annotation.
  const filter = Filter.type(type as any) as Filter.Any;
  const defaultQuery = Query.select(filter);
  const testId = `${typename}.section`;

  // Sourced from the explicit override, then the schema's own annotation, then a fallback derived
  // from the typename — every type section is URL-addressable out of the box, no manual wiring
  // needed for the common case (see `@dxos/app-graph`'s `path-resolution.ts`).
  const urlKey =
    options?.urlKey ??
    Option.getOrUndefined(AppAnnotation.UrlPrefixAnnotation.get(Type.getSchema(type))) ??
    (typename.split('.').pop() ?? typename).toLowerCase();

  const label = AppNode.getDynamicLabel('typename.label', typename, { count: 2 });

  // Only allow reordering within this section — reject drops from other type sections.
  const canDropSameType = (source: TreeData) =>
    Node.isGraphNode(source.item) && Obj.isObject(source.item.data) && Obj.getTypename(source.item.data) === typename;

  const sectionExtension = GraphBuilder.createExtension({
    id: typename,
    urlKey,
    match: options?.match ?? AppNodeMatcher.whenSpace,
    connector: (space, get) => {
      const objects = get(space.db.query(options?.query ?? defaultQuery).atom) as Obj.Unknown[];
      if (objects.length === 0) {
        return Effect.succeed([]);
      }

      // Re-emits when space.properties changes; the stored order is a list of object refs (uri read without
      // loading the target).
      const storedRefs =
        get(Annotation.atomProperty(space.properties, AppAnnotation.SectionOrderAnnotation, typename)) ?? [];
      const order = storedRefs
        .map((ref) => (EID.isEID(ref.uri) ? EID.getEntityId(ref.uri) : undefined))
        .filter((id): id is string => id !== undefined);
      // Objects not in the stored order follow in query order.
      const orderedObjects = inferObjectOrder(
        Object.fromEntries(objects.map((object): [string, Obj.Unknown] => [object.id, object])),
        order,
      );

      const onRearrange = makeSectionRearrangeCallback(space, typename);

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
            draggable: false,
            droppable: false,
            space,
            testId,
            ...(options?.position ? { position: options.position } : {}),
          },
          nodes: orderedObjects
            .map((object) => AppNode.makeObject({ get, db: space.db, object, onRearrange, canDrop: canDropSameType }))
            .filter((node): node is NonNullable<typeof node> => node !== null),
        }),
      ]);
    },
  });

  if (!options?.createObject) {
    return sectionExtension;
  }

  const { createObject } = options;

  const actionsExtension = GraphBuilder.createExtension({
    id: `${typename}.sectionCreate`,
    match: (node) => {
      const space = isSpace(node.properties.space) ? node.properties.space : undefined;
      return node.type === typename && space ? Option.some(space) : Option.none();
    },
    actions: (space) =>
      Effect.succeed([
        Node.makeAction({
          id: 'create',
          data: () => createObject(space),
          properties: {
            label: ['add-object.label', { ns: typename }],
            icon: 'ph--plus--regular',
            disposition: 'list-item-primary',
          },
        }),
      ]),
  });

  return Effect.map(Effect.all([sectionExtension, actionsExtension]), ([section, actions]) => [...section, ...actions]);
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
 */
export const createTypeSectionPathResolver = (
  type: Type.AnyEntity,
  options?: {
    /** Group node ID to include as a path segment between the space and the typename, e.g. 'ai'. */
    groupId?: string;
  },
): AppCapabilities.NavigationPathResolver => {
  const typename = Type.getTypename(type);
  invariant(typename, 'Schema must have a typename to create a type section path resolver.');
  return (qualifiedPath) => {
    const spaceId = Paths.getSpaceIdFromPath(qualifiedPath);
    if (!spaceId) {
      return Effect.succeed(Option.none());
    }

    const sectionPath = options?.groupId
      ? Paths.getSpacePath(spaceId, options.groupId, typename)
      : Paths.getSpacePath(spaceId, typename);
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
