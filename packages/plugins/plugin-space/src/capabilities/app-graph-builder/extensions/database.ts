//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { Capability, type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Entity, Filter, Key, Obj, Query, Scope, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { ViewAnnotation } from '@dxos/schema';
import { isLabel, toLocalizedString } from '@dxos/ui-types/translations';
import { createFilename, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { SpaceCapabilities } from '#types';

import { makeCreateObjectEntryForDatabaseType } from '../../../util';
import {
  ADD_VIEW_TO_SCHEMA_LABEL,
  DATABASE_SECTION_TYPE,
  SCHEMA_NODE_TYPE,
  SNAPSHOT_BY_SCHEMA_LABEL,
  buildViewIndex,
  downloadBlob,
} from './shared';

//
// Extension Factory
//

/** Creates database extensions: types section, schema nodes, schema children, and schema actions. */
export const createDatabaseExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;

  return yield* Effect.all([
    // System section group — created alongside database/settings so the group always
    // appears when the space plugin is active and hides when there are no children.
    GraphBuilder.createExtension({
      id: Paths.GroupSegments.system,
      match: AppNodeMatcher.whenSpace,
      connector: (space) =>
        Effect.succeed([
          AppNode.makeGroup({
            id: Paths.GroupSegments.system,
            type: Paths.GroupTypes.system,
            label: ['nav-tree-group-system.label', { ns: meta.profile.key }],
            space,
            position: 900,
          }),
        ]),
    }),

    // Types section virtual node under the system group.
    GraphBuilder.createExtension({
      id: 'databaseSection',
      match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.system),
      connector: (space) => {
        return Effect.succeed([
          AppNode.makeSection({
            id: Paths.Segments.database,
            type: DATABASE_SECTION_TYPE,
            label: ['database-section.label', { ns: meta.profile.key }],
            icon: 'ph--database--regular',
            space,
            testId: 'spacePlugin.databaseSection',
          }),
        ]);
      },
    }),

    // Schema nodes under the Types virtual node.
    GraphBuilder.createExtension({
      id: 'database',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === DATABASE_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        // Read settings reactively — same pattern as the translator read below.
        const settingsAtom = get(capabilities.atom(SpaceCapabilities.Settings)).at(0);
        const showHidden = settingsAtom ? get(settingsAtom).showHidden : false;

        // Persisted types live in the space db; static/runtime types live in the shared registry.
        // Fan across both so the space's own types appear without leaking other spaces' types.
        const allSchemas = get(
          space.db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).atom,
        );

        const userSchemas = allSchemas.filter((type) => {
          if (Type.isRelation(type)) {
            return false;
          }
          if (Type.isTypeKind(type)) {
            return false;
          }
          const schema = Type.getSchema(type);
          if (!showHidden && HiddenAnnotation.get(schema).pipe(Option.getOrElse(() => false))) {
            return false;
          }
          if (Type.getTypename(type) === Type.getTypename(Collection.Collection)) {
            return false;
          }
          return true;
        });

        const viewIndex = buildViewIndex(get, space, allSchemas);

        const visibleSchemas = userSchemas.filter((schema) => {
          if (Type.getDatabase(schema) != null) {
            return true;
          }
          const typeUri = Type.getURI(schema);
          const objects = get(space.db.query(Filter.type(typeUri)).atom);
          if (ViewAnnotation.has(schema)) {
            return objects.some((obj) => !viewIndex.isView(obj));
          }
          return objects.length > 0 || viewIndex.typeUrisWithViews.has(typeUri);
        });

        // Sort alphabetically by display name. Static types' labels are `typename.label` translation
        // keys resolved at render; resolve them here via the Translator capability so the order matches
        // what users see. Resolved reactively inside the connector (not at factory setup) so the
        // capability — contributed during startup by the theme plugin — is present when this runs.
        const translator = get(capabilities.atom(AppCapabilities.Translator)).at(0);
        const labelOf = (node: Node.NodeArg<Type.AnyEntity>): string => {
          const label = node.properties?.label;
          if (translator && isLabel(label)) {
            return toLocalizedString(label, translator.t);
          }
          return node.data ? Type.getTypename(node.data) : '';
        };

        return Effect.succeed(
          visibleSchemas
            .map((schema) => createSchemaNode({ schema, space, get }))
            .toSorted((nodeA, nodeB) => labelOf(nodeA).localeCompare(labelOf(nodeB))),
        );
      },
    }),

    // {All} virtual node + view objects under each schema node.
    GraphBuilder.createExtension({
      id: 'schemaChildren',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        // Scoped to the Database section's own type nodes (both static and database schemas — see
        // SCHEMA_NODE_TYPE): other plugins' type nodes (e.g. plugin-crm's virtual type nodes) share the
        // `Type.isType(node.data)` shape but should stay leaf nodes for now.
        return node.type === SCHEMA_NODE_TYPE && space && Type.isType(node.data)
          ? Option.some({ space, schema: node.data })
          : Option.none();
      },
      connector: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client ? get(client.graph.registry.query(Filter.type(Type.Type)).atom) : [];
        const typeUri = Type.getURI(schema);

        // View objects are the type node's only visible children; objects of the type are resolved
        // on demand as hidden children (see the `typeCollectionObject` resolver). The list of all
        // objects is rendered when the type node is selected (see TypeArticle).
        const viewIndex = buildViewIndex(get, space, schemas);
        const viewNodes = viewIndex
          .getViewsForTypeUri(typeUri)
          .map((object: Obj.Unknown) =>
            AppNode.makeObject({
              get,
              db: space.db,
              object,
              draggable: false,
              droppable: false,
            }),
          )
          .filter(isNonNullable);

        return Effect.succeed(viewNodes);
      },
    }),

    // Objects of a type are not enumerated in the nav tree; navigating directly to the canonical
    // object path resolves the object on demand as a hidden child of its type node. Mirrors the
    // inbox feed-object resolver: a resolver keyed on path shape, not a connector.
    GraphBuilder.createExtension({
      id: 'typeCollectionObject',
      match: () => Option.none(),
      resolver: (qualifiedId, get) =>
        Effect.gen(function* () {
          const segments = qualifiedId.split('/');
          // Discriminator: the canonical object path `…/database/<slug>/<objectId>`.
          if (segments.at(-3) !== Paths.Segments.database) {
            return null;
          }

          const spaceId = Paths.getSpaceIdFromPath(qualifiedId);
          const objectId = segments.at(-1);
          if (!spaceId || !objectId || !Key.EntityId.isValid(objectId)) {
            return null;
          }

          const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
          const space = client?.spaces.get(spaceId);
          if (!space) {
            return null;
          }

          // Feed-only objects (e.g. games appended via Feed.append) are not in the Automerge graph;
          // includeAllFeeds scope resolves them from feed queues by id.
          const object = get(
            space.db.query(Query.select(Filter.id(objectId)).from(space.db, { includeFeeds: true })).atom,
          ).at(0);
          if (!object) {
            return null;
          }

          get(Obj.atom(object));
          const node = AppNode.makeObject({
            get,
            db: space.db,
            object,
            disposition: 'hidden',
            draggable: false,
            droppable: false,
          });
          // Resolver nodes are keyed by the requested path (not the local object id) so the parent
          // type node's child edge connects; `makeObject` uses the local id, so override it here.
          return node && { ...node, id: qualifiedId };
        }),
    }),

    // Actions for schema nodes.
    GraphBuilder.createExtension({
      id: 'schemaActions',
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return space && Type.isType(node.data) ? Option.some({ space, schema: node.data }) : Option.none();
      },
      actions: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client ? get(client.graph.registry.query(Filter.type(Type.Type)).atom) : [];

        const targetUri = Type.getURI(schema);
        const viewIndex = buildViewIndex(get, space, schemas);
        const deletable = Type.getDatabase(schema) != null && viewIndex.getViewsForTypeUri(targetUri).length === 0;

        return Effect.succeed(createSchemaActions({ type: schema, space, deletable, capabilities }));
      },
    }),
  ]);
});

//
// Helpers
//

/** Returns schemas keyed uniquely by typename, preferring later entries. */
const uniqueSchemasByTypename = <TSchema extends Type.AnyEntity>(schemas: TSchema[]): TSchema[] => {
  const uniqueSchemas = new Map<string, TSchema>();
  for (const schema of schemas) {
    uniqueSchemas.set(Type.getTypename(schema), schema);
  }

  return [...uniqueSchemas.values()];
};

/** Builds a graph node for a schema in the Types subtree. */
const createSchemaNode = ({
  schema,
  space,
  get,
}: {
  schema: Type.AnyEntity;
  space: Space;
  get: Atom.Context;
}): Node.NodeArg<Type.AnyEntity> => {
  const typename = Type.getTypename(schema);
  // The node id doubles as the `types/<slug>` path segment, so it must be slash- and colon-free:
  // a stored schema's entity id, or a static schema's typename.
  const slug = Paths.getTypeSlug(schema);
  const iconAnnotation =
    Type.getDatabase(schema) == null
      ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(schema)))
      : undefined;
  const { label, nodeId } = Match.value(schema).pipe(
    Match.when(
      (value: Type.AnyEntity) => Type.getDatabase(value) != null,
      (mutableSchema) => {
        // Type.AnyEntity has KindId=Type at the type level but is a valid ECHO entity at runtime.
        const snapshot = get(Entity.atom(mutableSchema as unknown as Entity.Unknown));
        return {
          label: (snapshot as { name?: string }).name || [
            'object-name.placeholder',
            { ns: Type.getTypename(Type.Type) },
          ],
          nodeId: slug,
        };
      },
    ),
    Match.orElse(() => ({
      label: AppNode.getDynamicLabel('typename.label', typename, { count: 2, defaultValue: typename }),
      nodeId: slug,
    })),
  );
  const icon =
    Type.getDatabase(schema) != null ? 'ph--cube--regular' : (iconAnnotation?.icon ?? 'ph--circle-dashed--regular');
  const iconHue = Type.getDatabase(schema) != null ? 'neutral' : iconAnnotation?.hue;
  return Node.make({
    id: nodeId,
    type: SCHEMA_NODE_TYPE,
    data: schema,
    properties: {
      label,
      icon,
      iconHue,
      // Selecting the type node opens a list of every object of this type (see TypeArticle);
      // objects resolve on demand as hidden children. View objects are its only visible children, so
      // without a view the node is a leaf (no `role: 'branch'`).
      testId: `spacePlugin.schemaNode.${typename}`,
      selectable: true,
      draggable: false,
      droppable: false,
      childrenDroppable: false,
      space,
    },
  });
};

/** Builds schema actions (add view, rename, delete, snapshot). */
const createSchemaActions = ({
  type,
  space,
  deletable,
  capabilities,
}: {
  type: Type.AnyEntity;
  space: Space;
  deletable: boolean;
  capabilities: CapabilityManager.CapabilityManager;
}) => {
  const typename = Type.getTypename(type);
  const createEntry = capabilities
    .getAll(SpaceCapabilities.CreateObjectEntry)
    .find((entry: SpaceCapabilities.CreateObjectEntry) => entry.id === typename);

  // For database-persisted object schemas without a dedicated capability, synthesize a generic entry.
  const resolvedEntry: SpaceCapabilities.CreateObjectEntry | undefined =
    createEntry ??
    (Type.getDatabase(type) != null && Type.isObject(type) ? makeCreateObjectEntryForDatabaseType(type) : undefined);
  const createObjectFn = resolvedEntry?.createObject;
  const inputSchema = resolvedEntry?.inputSchema;

  const actions: Node.NodeArg<Node.ActionData<Operation.Service>>[] = [
    ...(createObjectFn
      ? [
          Node.makeAction({
            id: SpaceOperation.OpenCreateObject.meta.key,
            data: Effect.fnUntraced(function* () {
              if (inputSchema) {
                yield* Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename,
                });
              } else {
                const result = yield* createObjectFn({}, { db: space.db, target: space.db }).pipe(
                  Effect.provideService(Capability.Service, capabilities),
                );
                if (result.subject.length > 0) {
                  yield* Operation.invoke(LayoutOperation.Open, {
                    subject: [...result.subject],
                    navigation: 'immediate',
                  });
                }
              }
            }),
            properties: {
              // Static plugin types carry a per-typename `add-object.label` (e.g. "Add event");
              // database types have no such namespace, so fall back to the plugin's generic label.
              label: AppNode.getDynamicLabel(
                'add-object.label',
                Type.getDatabase(type) != null ? meta.profile.key : typename,
              ),
              icon: 'ph--plus--regular',
              disposition: 'list-item-primary',
              testId: 'spacePlugin.createObject',
            },
          }),
        ]
      : []),
    Node.makeAction({
      id: `${SpaceOperation.AddObject.meta.key}-view`,
      data: () =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          views: true,
          // The type-picker field value is the type URI (see TypeOptions), so seed the default with
          // the URI — not the bare typename — for the option to be pre-selected.
          initialFormValues: { typename: Type.getURI(type) },
        }),
      properties: {
        label: ADD_VIEW_TO_SCHEMA_LABEL,
        icon: 'ph--circles-three-plus--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.addViewToSchema',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.RenameObject.meta.key,
      data: (params?: Node.InvokeProps) =>
        Type.getDatabase(type) != null
          ? Operation.invoke(SpaceOperation.RenameObject, {
              object: type,
              caller: `${params?.caller}:${params?.parent?.id}`,
            })
          : Effect.fail(new Error('Cannot rename immutable schema')),
      properties: {
        label: AppNode.getDynamicLabel('rename-object.label', Type.getTypename(Type.Type)),
        icon: 'ph--pencil-simple-line--regular',
        disabled: Type.getDatabase(type) == null,
        disposition: 'list-item',
        testId: 'spacePlugin.renameObject',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.RemoveObjects.meta.key,
      data: () =>
        Type.getDatabase(type) != null
          ? Operation.invoke(SpaceOperation.RemoveObjects, {
              objects: [type],
            })
          : Effect.succeed(undefined),
      properties: {
        label: AppNode.getDynamicLabel('delete-object.label', Type.getTypename(Type.Type)),
        icon: 'ph--trash--regular',
        disposition: 'list-item',
        disabled: !deletable,
        testId: 'spacePlugin.deleteObject',
      },
    }),
    Node.makeAction({
      id: SpaceOperation.Snapshot.meta.key,
      data: Effect.fnUntraced(function* () {
        const result = yield* Operation.invoke(SpaceOperation.Snapshot, {
          db: space.db,
          query: Query.select(Filter.type(type)).ast,
        });
        if (result.snapshot) {
          yield* Effect.tryPromise(() =>
            downloadBlob(result.snapshot, createFilename({ parts: [space.id, Type.getTypename(type)], ext: 'json' })),
          );
        }
      }),
      properties: {
        label: SNAPSHOT_BY_SCHEMA_LABEL,
        icon: 'ph--camera--regular',
        disposition: 'list-item',
      },
    }),
  ];

  return actions;
};
