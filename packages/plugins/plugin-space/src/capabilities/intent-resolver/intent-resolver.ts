//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, type Label, createIntent, createResolver } from '@dxos/app-framework';
import { SpaceState, getSpace } from '@dxos/client/echo';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { Database, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { EchoDatabaseImpl, Serializer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention/types';
import { iconValues } from '@dxos/react-ui-pickers/icons';
import { Collection, ProjectionModel, getTypenameFromQuery } from '@dxos/schema';
import { hues } from '@dxos/ui-theme';

import type { CreateObjectDialogProps, JoinDialogProps } from '../../components';
import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  JOIN_DIALOG,
  OBJECT_RENAME_POPOVER,
  SPACE_RENAME_POPOVER,
} from '../../constants';
import { SpaceEvents } from '../../events';
import { meta } from '../../meta';
import { CollectionAction, SpaceAction, SpaceCapabilities } from '../../types';
import { COMPOSER_SPACE_LOCK, cloneObject, getNestedObjects } from '../../util';

// TODO(wittjosiah): Remove.
const SPACE_MAX_OBJECTS = 750;

type IntentResolverOptions = {
  context: Capability.PluginContext;
  createInvitationUrl: (invitationCode: string) => string;
  observability?: boolean;
};

export default Capability.makeModule(({ context, observability, createInvitationUrl }: IntentResolverOptions) =>
  Effect.sync(() => {
    const resolve = (typename: string) =>
      context.getCapabilities(Common.Capability.Metadata).find(({ id }: { id: string }) => id === typename)?.metadata ??
      {};

    return Capability.contributes(Common.Capability.IntentResolver, [
      createResolver({
        intent: SpaceAction.OpenCreateSpace,
        resolve: () => ({
          intents: [
            createIntent(Common.LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: CREATE_SPACE_DIALOG,
              options: {
                blockAlign: 'start',
              },
            }),
          ],
        }),
      }),
      createResolver({
        intent: SpaceAction.Create,
        resolve: async ({ name, hue: hue_, icon: icon_, edgeReplication }) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const hue = hue_ ?? hues[Math.floor(Math.random() * hues.length)];
          const icon = icon_ ?? iconValues[Math.floor(Math.random() * iconValues.length)];
          const space = await client.spaces.create({ name, hue, icon });
          if (edgeReplication) {
            await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
          }
          await space.waitUntilReady();

          // Create root collection.
          const collection = Obj.make(Collection.Collection, { objects: [] });
          space.properties[Collection.Collection.typename] = Ref.make(collection);

          // Set current migration version.
          if (Migrations.versionProperty) {
            space.properties[Migrations.versionProperty] = Migrations.targetVersion;
          }

          // Create records smart collection.
          collection.objects.push(Ref.make(Collection.makeManaged({ key: Type.getTypename(Type.PersistentType) })));

          // Allow other plugins to add default content.
          await runAndForwardErrors(context.activate(SpaceEvents.SpaceCreated));
          // TODO(migration): OnCreateSpace now returns Effects instead of Intents.
          // const onCreateSpaceCallbacks = context.getCapabilities(SpaceCapabilities.OnCreateSpace);
          // const spaceCreatedIntents = onCreateSpaceCallbacks.map((onCreateSpace: (params: any) => any) =>
          //   onCreateSpace({ space, isDefault: false, rootCollection: collection }),
          // );

          return {
            data: {
              id: space.id,
              subject: [space.id],
              space,
            },
            intents: [
              // ...spaceCreatedIntents,
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.create',
                      properties: {
                        spaceId: space.id,
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.Join,
        resolve: ({ invitationCode, onDone }) => ({
          intents: [
            createIntent(Common.LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: JOIN_DIALOG,
              options: {
                blockAlign: 'start',
                props: {
                  initialInvitationCode: invitationCode,
                  onDone,
                } satisfies Partial<JoinDialogProps>,
              },
            }),
          ],
        }),
      }),
      createResolver({
        intent: SpaceAction.OpenMembers,
        resolve: ({ space }) => ({
          intents: [
            createIntent(Common.LayoutAction.Open, {
              part: 'main',
              subject: [`members-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
              options: {
                workspace: space.id,
              },
            }),
          ],
        }),
      }),
      createResolver({
        intent: SpaceAction.Share,
        resolve: ({ space, type, authMethod, multiUse, target }) => {
          const invitation = space.share({ type, authMethod, multiUse, target });
          return {
            data: invitation,
            intents: observability
              ? [
                  createIntent(ObservabilityAction.SendEvent, {
                    name: 'space.share',
                    properties: {
                      spaceId: space.id,
                    },
                  }),
                ]
              : [],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.GetShareLink,
        resolve: ({ space, target, copyToClipboard }) =>
          Effect.gen(function* () {
            const { dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
            const invitation = yield* dispatch(
              createIntent(SpaceAction.Share, {
                space,
                type: Invitation.Type.DELEGATED,
                authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
                multiUse: true,
                target,
              }),
            );

            // TODO(wittjosiah): Better api to for this.
            // NOTE: Delegated invitations are invalid until the connecting state when keys are filled in.
            const invitationCode = yield* Effect.tryPromise(
              () =>
                new Promise<string>((resolve) => {
                  invitation.subscribe((invitation: any) => {
                    if (invitation.state === Invitation.State.CONNECTING) {
                      resolve(InvitationEncoder.encode(invitation));
                    }
                  });
                }),
            );
            const url = createInvitationUrl(invitationCode);
            if (copyToClipboard) {
              yield* Effect.tryPromise(() => navigator.clipboard.writeText(url));
            }

            return { data: url };
          }),
      }),
      createResolver({
        intent: SpaceAction.Lock,
        resolve: ({ space }) => {
          space.properties[COMPOSER_SPACE_LOCK] = true;
          return {
            intents: [
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.lock',
                      properties: {
                        spaceId: space.id,
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.Unlock,
        resolve: ({ space }) => {
          space.properties[COMPOSER_SPACE_LOCK] = false;
          return {
            intents: [
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.unlock',
                      properties: {
                        spaceId: space.id,
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.Rename,
        resolve: ({ caller, space }) => {
          return {
            intents: [
              createIntent(Common.LayoutAction.UpdatePopover, {
                part: 'popover',
                subject: SPACE_RENAME_POPOVER,
                options: {
                  anchorId: `dxos.org/ui/${caller}/${space.id}`,
                  props: space,
                },
              }),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.OpenSettings,
        resolve: ({ space }) => ({
          intents: [
            createIntent(Common.LayoutAction.Open, {
              part: 'main',
              subject: [`properties-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
              options: {
                workspace: space.id,
              },
            }),
          ],
        }),
      }),
      createResolver({
        intent: SpaceAction.Open,
        resolve: async ({ space }) => {
          await space.open();
        },
      }),
      createResolver({
        intent: SpaceAction.Close,
        resolve: async ({ space }) => {
          await space.close();
        },
      }),
      createResolver({
        intent: SpaceAction.Migrate,
        resolve: async ({ space, version: targetVersion }) => {
          const state = context.getCapability(SpaceCapabilities.MutableState);

          if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
            state.sdkMigrationRunning[space.id] = true;
            await space.internal.migrate();
            state.sdkMigrationRunning[space.id] = false;
          }
          const result = await Migrations.migrate(space, targetVersion);
          const version = Migrations.versionProperty ? space.properties[Migrations.versionProperty] : undefined;
          return {
            data: result,
            intents: [
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.migrate',
                      properties: {
                        spaceId: space.id,
                        targetVersion,
                        version,
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.Snapshot,
        resolve: async ({ db, query }) => {
          invariant(db instanceof EchoDatabaseImpl, 'Database must be an instance of EchoDatabaseImpl');
          const backup = await new Serializer().export(db, query && Query.fromAst(query));
          return {
            data: {
              snapshot: new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
            },
          };
        },
      }),
      createResolver({
        intent: SpaceAction.UseStaticSchema,
        resolve: async ({ db, typename, show: _show }) => {
          const client = context.getCapability(ClientCapabilities.Client);
          const schema = await client.graph.schemaRegistry.query({ typename, location: ['runtime'] }).first();
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');

          if (!space.properties.staticRecords) {
            space.properties.staticRecords = [];
          }

          if (!space.properties.staticRecords.includes(typename)) {
            space.properties.staticRecords.push(typename);
          }

          await runAndForwardErrors(context.activate(SpaceEvents.SchemaAdded));
          // TODO(migration): OnSchemaAdded now returns Effects instead of Intents.
          // const onSchemaAdded = context.getCapabilities(SpaceCapabilities.OnSchemaAdded);
          // const schemaAddedIntents = onSchemaAdded.map((onSchemaAdded: (params: any) => any) =>
          //   onSchemaAdded({ db, schema, show }),
          // );

          return {
            data: {},
            intents: [
              // ...schemaAddedIntents,
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.schema.use',
                      properties: {
                        spaceId: space.id,
                        typename: Type.getTypename(schema),
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.AddSchema,
        resolve: async ({ db, name, typename, version, schema: schemaInput, show: _show }) => {
          const [schema] = await db.schemaRegistry.register([schemaInput]);
          if (name) {
            schema.storedSchema.name = name;
          }
          if (typename) {
            schema.storedSchema.typename = typename;
          }
          if (version) {
            schema.storedSchema.version = version;
          }

          await runAndForwardErrors(context.activate(SpaceEvents.SchemaAdded));
          // TODO(migration): OnSchemaAdded now returns Effects instead of Intents.
          // const onSchemaAdded = context.getCapabilities(SpaceCapabilities.OnSchemaAdded);
          // const schemaAddedIntents = onSchemaAdded.map((onSchemaAdded: (params: any) => any) =>
          //   onSchemaAdded({ db, schema, show }),
          // );

          return {
            data: {
              id: schema.id,
              object: schema.storedSchema,
              schema,
            },
            intents: [
              // ...schemaAddedIntents,
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.schema.add',
                      properties: {
                        spaceId: db.spaceId,
                        objectId: schema.id,
                        typename: schema.typename,
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.DeleteField,
        resolve: async ({ view, fieldId, deletionData }, undo) => {
          const db = Obj.getDatabase(view);
          invariant(db);
          const typename = getTypenameFromQuery(view.query.ast);
          invariant(typename);
          const schema = await db.schemaRegistry.query({ typename }).firstOrUndefined();
          invariant(schema);
          const projection = new ProjectionModel(schema.jsonSchema, view.projection);
          if (!undo) {
            const { deleted, index } = projection.deleteFieldProjection(fieldId);
            return {
              undoable: {
                message: ['field deleted label', { ns: meta.id }],
                data: { deletionData: { ...deleted, index } },
              },
            };
          } else if (undo && deletionData) {
            const { field, props, index } = deletionData;
            projection.setFieldProjection({ field, props }, index);
          }
        },
      }),
      createResolver({
        intent: SpaceAction.OpenCreateObject,
        resolve: ({ target, views, typename, initialFormValues, navigable = true, onCreateObject }) => {
          const state = context.getCapability(SpaceCapabilities.State);

          return {
            intents: [
              createIntent(Common.LayoutAction.UpdateDialog, {
                part: 'dialog',
                subject: CREATE_OBJECT_DIALOG,
                options: {
                  blockAlign: 'start',
                  props: {
                    target,
                    views,
                    typename,
                    initialFormValues,
                    onCreateObject,
                    shouldNavigate: navigable
                      ? (object: Obj.Any) => {
                          const isCollection = Obj.instanceOf(Collection.Collection, object);
                          const isSystemCollection = Obj.instanceOf(Collection.Managed, object);
                          return (!isCollection && !isSystemCollection) || state.navigableCollections;
                        }
                      : () => false,
                  } satisfies Partial<CreateObjectDialogProps>,
                },
              }),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.AddObject,
        resolve: async ({ target, object, hidden }) => {
          const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
          invariant(db, 'Database not found.');

          if (db instanceof EchoDatabaseImpl && db.coreDatabase.getAllObjectIds().length >= SPACE_MAX_OBJECTS) {
            return {
              error: new Error('Space limit reached.'),
              intents: [
                createIntent(Common.LayoutAction.AddToast, {
                  part: 'toast',
                  subject: {
                    id: `${meta.id}/space-limit`,
                    title: ['space limit label', { ns: meta.id }],
                    description: ['space limit description', { ns: meta.id }],
                    duration: 5_000,
                    icon: 'ph--warning--regular',
                    actionLabel: ['remove deleted objects label', { ns: meta.id }],
                    actionAlt: ['remove deleted objects alt', { ns: meta.id }],
                    closeLabel: ['close label', { ns: 'os' }],
                    onAction: () => db instanceof EchoDatabaseImpl && db.coreDatabase.unlinkDeletedObjects(),
                  },
                }),
                ...(observability
                  ? [
                      createIntent(ObservabilityAction.SendEvent, {
                        name: 'space.limit',
                        properties: {
                          spaceId: db.spaceId,
                        },
                      }),
                    ]
                  : []),
              ],
            };
          }

          await Collection.add({
            object,
            target: Database.isDatabase(target) ? undefined : target,
            hidden,
          }).pipe(Effect.provide(Database.Service.layer(db)), runAndForwardErrors);

          return {
            data: {
              id: Obj.getDXN(object).toString(),
              subject: [Obj.getDXN(object).toString()],
              object,
            },
            intents: [
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.object.add',
                      properties: {
                        spaceId: db.spaceId,
                        objectId: object.id,
                        typename: Obj.getTypename(object),
                      },
                    }),
                  ]
                : []),
            ],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.AddRelation,
        resolve: ({ db, schema, source, target, fields }) => {
          const relation = db.add(
            Relation.make(schema, {
              [Relation.Source]: source,
              [Relation.Target]: target,
              ...fields,
            }),
          );

          return {
            data: {
              relation,
            },
          };
        },
      }),
      createResolver({
        intent: SpaceAction.RemoveObjects,
        resolve: async ({ objects, target, deletionData }, undo) => {
          const layout = context.getCapability(Common.Capability.Layout);

          // All objects must be a member of the same space.
          const space = getSpace(objects[0]);
          invariant(space && objects.every((obj) => Obj.isObject(obj) && getSpace(obj) === space));
          const openObjectIds = new Set<string>(layout.active);

          if (!undo) {
            const parentCollection: Collection.Collection =
              target ?? space.properties[Collection.Collection.typename]?.target;
            const nestedObjectsList = await Promise.all(objects.map((obj) => getNestedObjects(obj, resolve)));

            const deletionData = {
              objects,
              parentCollection,
              indices: objects.map((obj) =>
                Obj.instanceOf(Collection.Collection, parentCollection)
                  ? parentCollection.objects.findIndex((object) => object.target === obj)
                  : -1,
              ),
              nestedObjectsList,
              wasActive: objects
                .flatMap((obj, i) => [obj, ...nestedObjectsList[i]])
                .map((obj) => Obj.getDXN(obj).toString())
                .filter((id) => openObjectIds.has(id)),
            } satisfies SpaceAction.DeletionData;

            if (Obj.instanceOf(Collection.Collection, deletionData.parentCollection)) {
              [...deletionData.indices]
                .sort((a, b) => b - a)
                .forEach((index: number) => {
                  if (index !== -1) {
                    deletionData.parentCollection.objects.splice(index, 1);
                  }
                });
            }

            deletionData.nestedObjectsList.flat().forEach((obj) => {
              space.db.remove(obj);
            });
            objects.forEach((obj) => space.db.remove(obj));

            // TODO(wittjosiah): Once we can compose translations outside of react, use count instead.
            //   ['deleted label', { ns: meta.id, typename: ['typename label', { ns: typename, count: objects.length }] }]
            const undoMessageLabel: Label =
              objects.length === 1
                ? [
                    'object deleted label',
                    { ns: Obj.getTypename(objects[0]) ?? meta.id, defaultValue: 'Object deleted' },
                  ]
                : ['objects deleted label', { ns: meta.id }];

            return {
              undoable: {
                // TODO(ZaymonFC): Pluralize if more than one object.
                message: undoMessageLabel,
                data: { deletionData },
              },
              intents:
                deletionData.wasActive.length > 0
                  ? [
                      createIntent(Common.LayoutAction.Close, {
                        part: 'main',
                        subject: deletionData.wasActive,
                        options: { state: false },
                      }),
                    ]
                  : undefined,
            };
          } else {
            if (
              deletionData?.objects?.length &&
              deletionData.objects.every(Obj.isObject) &&
              Obj.instanceOf(Collection.Collection, deletionData.parentCollection)
            ) {
              // Restore the object to the space.
              const restoredObjects = deletionData.objects.map((obj: Obj.Any) => space.db.add(obj));

              // Restore nested objects to the space.
              deletionData.nestedObjectsList.flat().forEach((obj: Obj.Any) => {
                space.db.add(obj);
              });

              deletionData.indices.forEach((index: number, i: number) => {
                if (index !== -1) {
                  deletionData.parentCollection.objects.splice(index, 0, Ref.make(restoredObjects[i] as Obj.Any));
                }
              });

              return {
                intents:
                  deletionData.wasActive.length > 0
                    ? [
                        createIntent(Common.LayoutAction.Open, {
                          part: 'main',
                          subject: deletionData.wasActive,
                        }),
                      ]
                    : undefined,
              };
            }
          }
        },
      }),
      createResolver({
        intent: SpaceAction.RenameObject,
        resolve: async ({ object, caller }) => ({
          intents: [
            createIntent(Common.LayoutAction.UpdatePopover, {
              part: 'popover',
              subject: OBJECT_RENAME_POPOVER,
              options: {
                anchorId: `dxos.org/ui/${caller}/${Obj.getDXN(object).toString()}`,
                props: object,
              },
            }),
          ],
        }),
      }),
      createResolver({
        intent: SpaceAction.DuplicateObject,
        resolve: async ({ object, target }) => {
          const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
          invariant(db, 'Database not found.');
          const newObject = await cloneObject(object, resolve, db);
          return {
            intents: [createIntent(SpaceAction.AddObject, { object: newObject, target })],
          };
        },
      }),
      createResolver({
        intent: SpaceAction.WaitForObject,
        resolve: async ({ id }) => {
          const state = context.getCapability(SpaceCapabilities.MutableState);
          state.awaiting = id;
        },
      }),
      createResolver({
        intent: CollectionAction.Create,
        resolve: async ({ name }) => ({
          data: { object: Obj.make(Collection.Collection, { name, objects: [] }) },
        }),
      }),
    ]);
  }),
);
