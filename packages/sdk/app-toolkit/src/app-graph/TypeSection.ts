//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { GraphBuilder, Node } from '@dxos/app-graph';
import { type Space, isSpace } from '@dxos/client/echo';
import { Annotation, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { type TreeData } from '@dxos/react-ui-list';
import { Position, inferObjectOrder } from '@dxos/util';

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
 * Requires two coordinated pieces: `GraphPath.createTypeSectionPaths` and this extension, with a
 * {@link SpaceCapabilities.CreateObjectEntry} set to
 * `targetNodeId: options.targetNodeId ?? getSectionPath(spaceId)`. URL resolution (both directions)
 * is automatic — no path resolver to register — since the extension's `urlKey` declaration is all
 * `@dxos/app-graph`'s `path-resolution.ts` needs.
 *
 * Pass `createObject` to add a "+" action on the section header automatically.
 */
export const createTypeSectionExtension = (
  type: Type.AnyEntity,
  options: {
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
     * Group segment the section nests under (e.g. `GraphPath.GroupSegments.ai`), when `match` places it
     * beneath a navtree group rather than directly under the space. Included in the forward-resolution
     * `urlPath` so section objects at `root/<space>/<groupSegment>/<typename>/<id>` resolve
     * deterministically. Omit for a space-direct section (`root/<space>/<typename>/<id>`).
     */
    groupSegment?: string;
    /**
     * If provided, a "+" action is added to the section header that runs this effect when clicked.
     * The action label is resolved from `add-object.label` in the type's i18n namespace.
     */
    createObject?: (space: Space) => Effect.Effect<any, any, any>;
    /**
     * Registered URL prefix key for this section's connector (e.g. `doc`, `mail`). Keys are global, so
     * it is declared here rather than derived — see `@dxos/app-graph`'s `path-resolution.ts` for how
     * registered keys resolve and serialize URLs.
     */
    urlKey: string;
    /**
     * Registered URL key making the section node itself addressable (e.g. `library` → `/w/<space>/library`),
     * for a section that is worth linking to in its own right. Omit and the section stays a bare container:
     * only its objects are addressable, which is the default because `urlKey` alone cannot describe the
     * node sitting *at* its own path.
     *
     * Opting in splits the section into two extensions — one owning the section node, one owning its
     * objects — since a node is stamped from its producing extension's binding, and the two need different
     * ones. The objects are then materialized on expand rather than inline.
     */
    sectionUrlKey?: string;
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

  // Only allow reordering within this section — reject drops from other type sections.
  const canDropSameType = (source: TreeData) =>
    Node.isGraphNode(source.item) && Obj.isObject(source.item.data) && Obj.getTypename(source.item.data) === typename;

  /** Node-id segments from the space down to the section node — the section's own path. */
  const sectionSegments = options.groupSegment ? [options.groupSegment, typename] : [typename];

  /** The section's objects in their persisted order; empty means the section is suppressed. */
  const queryOrderedObjects = (space: Space, get: Atom.Context): Obj.Unknown[] => {
    const objects = get(space.db.query(options.query ?? defaultQuery).atom) as Obj.Unknown[];
    if (objects.length === 0) {
      return [];
    }

    // Re-emits when space.properties changes; the stored order is a list of object refs (uri read without
    // loading the target).
    const storedRefs =
      get(Annotation.atomProperty(space.properties, AppAnnotation.SectionOrderAnnotation, typename)) ?? [];
    const order = storedRefs
      .map((ref) => (EID.isEID(ref.uri) ? EID.getEntityId(ref.uri) : undefined))
      .filter((id): id is string => id !== undefined);
    // Objects not in the stored order follow in query order.
    return inferObjectOrder(
      Object.fromEntries(objects.map((object): [string, Obj.Unknown] => [object.id, object])),
      order,
    );
  };

  const buildObjectNodes = (space: Space, get: Atom.Context, orderedObjects: Obj.Unknown[]) => {
    const onRearrange = makeSectionRearrangeCallback(space, typename);
    return orderedObjects
      .map((object) => AppNode.makeObject({ get, db: space.db, object, onRearrange, canDrop: canDropSameType }))
      .filter((node): node is NonNullable<typeof node> => node !== null);
  };

  /** Matches this type's section node (the parent the objects and the create action hang off). */
  const whenSection = (node: Node.Node): Option.Option<Space> => {
    const space = isSpace(node.properties.space) ? node.properties.space : undefined;
    // `testId` is the exclusive sentinel: object nodes share `type === typename` but carry
    // `testId: 'spacePlugin.object'`, so this guard distinguishes section from object nodes.
    return node.type === typename && node.properties.testId === testId && space ? Option.some(space) : Option.none();
  };

  // The section node itself. Addressable in its own right only when sectionUrlKey is declared —
  // that makes it a singleton so selecting it opens a plank. Without it the node is a bare
  // container and only its objects get a URL.
  const sectionExtension = GraphBuilder.createExtension({
    id: typename,
    url: options.sectionUrlKey ? { key: options.sectionUrlKey, kind: 'singleton', path: sectionSegments } : undefined,
    match: options.match ?? AppNodeMatcher.whenSpace,
    connector: (space, get) => {
      if (queryOrderedObjects(space, get).length === 0) {
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
          // An addressable section carries the registered type entity so plugin-space's generic
          // type-collection surface can render it. A bare container carries an opaque marker.
          data: options.sectionUrlKey ? (typeEntity ?? `${typename}-root`) : `${typename}-root`,
          properties: {
            label,
            icon,
            ...(iconHue ? { iconHue } : {}),
            role: 'branch',
            draggable: false,
            droppable: false,
            space,
            testId,
            ...(options.position ? { position: options.position } : {}),
          },
        }),
      ]);
    },
  });

  // The section's objects — always a separate extension so each object gets its own item binding
  // (keyed by urlKey) independent of how the section node itself is addressed.
  const objectsExtension = GraphBuilder.createExtension({
    id: `${typename}.sectionObjects`,
    url: { key: options.urlKey, kind: 'item', path: sectionSegments },
    match: whenSection,
    connector: (space, get) => Effect.succeed(buildObjectNodes(space, get, queryOrderedObjects(space, get))),
  });

  const extensions = Effect.map(Effect.all([sectionExtension, objectsExtension]), ([section, objects]) => [
    ...section,
    ...objects,
  ]);

  if (!options.createObject) {
    return extensions;
  }

  const { createObject } = options;

  const actionsExtension = GraphBuilder.createExtension({
    id: `${typename}.sectionCreate`,
    match: whenSection,
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

  return Effect.map(Effect.all([extensions, actionsExtension]), ([base, actions]) => [...base, ...actions]);
};
