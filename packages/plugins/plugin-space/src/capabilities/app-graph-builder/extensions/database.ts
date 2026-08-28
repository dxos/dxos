//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type Space, isSpace } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Entity, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { ViewAnnotation } from '@dxos/schema';
import { isLabel, toLocalizedString } from '@dxos/ui-types/translations';
import { createFilename, downloadBlob, isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { SpaceCapabilities, SpaceEvents, SpaceOperation } from '#types';

import { makeCreateObjectEntryForDatabaseType } from '../../../util';
import {
  ADD_VIEW_TO_SCHEMA_LABEL,
  DATABASE_SECTION_TYPE,
  SCHEMA_NODE_TYPE,
  SNAPSHOT_BY_SCHEMA_LABEL,
  buildViewIndex,
} from './shared';

//
// Extension Factory
//

/** Creates database extensions: types section, schema nodes, schema children, and schema actions. */
export const createDatabaseExtensions = Effect.fnUntraced(function* () {
  const capabilities = yield* Capability.Service;
  const pluginManager = yield* Plugin.Service;
  // Fired from the schema-actions evaluation below, which re-runs reactively; the scheduler
  // short-circuits a dispatch with nothing left to activate, so repeats cost a lookup.
  const requestCreateObjectEntries = () =>
    EffectEx.runDetached(pluginManager.activate(SpaceEvents.CreateObjectRequested));

  return yield* Effect.all([
    // System section group — created alongside database/settings so the group always
    // appears when the space plugin is active and hides when there are no children.
    AppGraphBuilder.createExtension({
      id: GraphPath.GroupSegments.system,
      match: AppNodeMatcher.whenSpace,
      connector: (space) =>
        Effect.succeed([
          AppNode.makeGroup({
            id: GraphPath.GroupSegments.system,
            type: GraphPath.GroupTypes.system,
            label: ['nav-tree-group-system.label', { ns: meta.profile.key }],
            icon: 'ph--gear--regular',
            space,
            position: 900,
          }),
        ]),
    }),

    // Types section virtual node under the system group.
    AppGraphBuilder.createExtension({
      id: 'databaseSection',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.system),
      connector: (space) => {
        return Effect.succeed([
          AppNode.makeSection({
            id: GraphPath.Segments.database,
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
    AppGraphBuilder.createExtension({
      id: 'database',
      url: { key: 'type', kind: 'item', path: [GraphPath.GroupSegments.system, GraphPath.Segments.database] },
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === DATABASE_SECTION_TYPE && space ? Option.some(space) : Option.none();
      },
      connector: (space, get) => {
        // Read settings reactively — same pattern as the translator read below.
        const settingsAtom = get(capabilities.atom(SpaceCapabilities.SettingsAtom)).at(0);
        const showHidden = settingsAtom ? get(settingsAtom).showHidden : false;

        // Persisted types live in the space db; static/runtime types live in the shared registry.
        // Fan across both so the space's own types appear without leaking other spaces' types.
        const allSchemas = get(
          space.db.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry())).atom,
        );

        const userSchemas = allSchemas.filter((type) => {
          if (!TypeOptions.isUserType(type, { includeHidden: showHidden })) {
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
        const labelOf = (node: AppGraphNode.NodeArg<Type.AnyEntity>): string => {
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
    AppGraphBuilder.createExtension({
      id: 'schemaChildren',
      url: { key: 'view', kind: 'item', path: [GraphPath.GroupSegments.system, GraphPath.Segments.database] },
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

        // View objects are the type node's only visible children; every object of the type (viewed
        // or not) is also reachable via the `databaseObjects` extension below, keyed generically as
        // `obj`. The list of all objects is rendered when the type node is selected (see TypeArticle).
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

    // Every object of a type — not just its views — as a hidden child of its type node, so
    // `…/database/<slug>/<objectId>` resolves via the generic `db` key even when the type has no
    // dedicated section of its own. Disjoint from `schemaChildren`'s view nodes (`viewIndex.isView`
    // excludes them) so the two connectors never emit a node with the same id under the same parent.
    // The `db` key names the database subgraph — the generic key that guarantees every ECHO object a
    // URL (see the design's "Unmapped nodes"); `object` addresses the same object via the collection
    // subgraph.
    AppGraphBuilder.createExtension({
      id: 'databaseObjects',
      url: { key: 'db', kind: 'item', path: [GraphPath.GroupSegments.system, GraphPath.Segments.database] },
      match: (node) => {
        const space = isSpace(node.properties.space) ? node.properties.space : undefined;
        return node.type === SCHEMA_NODE_TYPE && space && Type.isType(node.data)
          ? Option.some({ space, schema: node.data })
          : Option.none();
      },
      connector: ({ space, schema }, get) => {
        const client = get(capabilities.atom(ClientCapabilities.Client)).at(0);
        const schemas = client ? get(client.graph.registry.query(Filter.type(Type.Type)).atom) : [];
        const typeUri = Type.getURI(schema);
        const viewIndex = buildViewIndex(get, space, schemas);

        // Feed-only objects (e.g. games appended via Feed.append) are not in the Automerge graph;
        // includeFeeds resolves them too.
        const objects = get(
          space.db.query(Query.select(Filter.type(typeUri)).from(space.db, { includeFeeds: true })).atom,
        );

        return Effect.succeed(
          objects
            .filter((object) => !viewIndex.isView(object))
            .map((object) =>
              AppNode.makeObject({
                get,
                db: space.db,
                object,
                disposition: 'hidden',
                draggable: false,
                droppable: false,
              }),
            )
            .filter(isNonNullable),
        );
      },
    }),

    // Actions for schema nodes.
    AppGraphBuilder.createExtension({
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

        // Tracked read (not a one-shot `getAll`): entry providers may be policy-parked, and the
        // computed actions must refresh when their contributions arrive. Evaluating a schema
        // node's actions is itself a create-flow demand signal, so fire it (outside the reactive
        // computation) to pull the parked providers.
        const createEntries = get(capabilities.atom(SpaceCapabilities.CreateObjectEntry));
        queueMicrotask(() => requestCreateObjectEntries());

        return Effect.succeed(createSchemaActions({ type: schema, space, deletable, capabilities, createEntries }));
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
  get: Atom.AtomContext;
}): AppGraphNode.NodeArg<Type.AnyEntity> => {
  const typename = Type.getTypename(schema);
  // The node id doubles as the `types/<slug>` path segment, so it must be slash- and colon-free:
  // a stored schema's entity id, or a static schema's typename.
  const slug = GraphPath.getTypeSlug(schema);
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
  return AppGraphNode.make({
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
  createEntries,
}: {
  type: Type.AnyEntity;
  space: Space;
  deletable: boolean;
  capabilities: CapabilityManager.CapabilityManager;
  createEntries: readonly SpaceCapabilities.CreateObjectEntry[];
}) => {
  const typename = Type.getTypename(type);
  const createEntry = createEntries.find((entry: SpaceCapabilities.CreateObjectEntry) => entry.id === typename);

  // For database-persisted object schemas without a dedicated capability, synthesize a generic entry.
  const resolvedEntry: SpaceCapabilities.CreateObjectEntry | undefined =
    createEntry ??
    (Type.getDatabase(type) != null && Type.isObject(type) ? makeCreateObjectEntryForDatabaseType(type) : undefined);
  const createObjectFn = resolvedEntry?.createObject;
  const inputSchema = resolvedEntry?.inputSchema;

  const actions: AppGraphNode.NodeArg<AppGraphNode.ActionData<Operation.Service>>[] = [
    ...(createObjectFn
      ? [
          AppGraphNode.makeAction({
            id: SpaceOperation.OpenObjectForm.meta.key,
            data: Effect.fnUntraced(function* () {
              if (inputSchema) {
                yield* Operation.invoke(SpaceOperation.OpenObjectForm, {
                  target: space.db,
                  typename,
                });
              } else {
                const result = yield* createObjectFn({}, { db: space.db }).pipe(
                  Effect.provideService(Capability.Service, capabilities),
                );
                // Nothing to navigate to when the create only starts the work and the object
                // arrives out of band (see `CreateObjectResult.object`).
                if (result.object) {
                  const { targets } = yield* Operation.invoke(NavigationOperation.ResolveNavigationTargets, {
                    query: { uri: Obj.getURI(result.object) },
                  });
                  const navigationTarget = targets[0];
                  if (navigationTarget) {
                    yield* Operation.invoke(LayoutOperation.Open, {
                      subject: [navigationTarget.path],
                      navigation: 'immediate',
                    });
                  }
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
    AppGraphNode.makeAction({
      id: `${SpaceOperation.AddObject.meta.key}-view`,
      data: () =>
        Operation.invoke(SpaceOperation.OpenObjectForm, {
          target: space.db,
          views: true,
          // The type-picker field value is the type URI (see TypeOptions), so seed the default with
          // the URI — not the bare typename — for the option to be pre-selected.
          defaults: { typename: Type.getURI(type) },
        }),
      properties: {
        label: ADD_VIEW_TO_SCHEMA_LABEL,
        icon: 'ph--circles-three-plus--regular',
        disposition: 'list-item',
        testId: 'spacePlugin.addViewToSchema',
      },
    }),
    AppGraphNode.makeAction({
      id: SpaceOperation.RenameObject.meta.key,
      data: (params?: AppGraphNode.InvokeProps) =>
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
    AppGraphNode.makeAction({
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
    AppGraphNode.makeAction({
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
