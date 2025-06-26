//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  contributes,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { Obj, Ref, Relation, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { isSpace, getSpace, SpaceState, fullyQualifiedId } from '@dxos/react-client/echo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { DataType } from '@dxos/schema';

import { SpaceCapabilities } from './capabilities';
import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  JOIN_DIALOG,
  POPOVER_RENAME_OBJECT,
  POPOVER_RENAME_SPACE,
  type CreateObjectDialogProps,
  type JoinDialogProps,
} from '../components';
import { SPACE_PLUGIN } from '../meta';
import { CollectionAction, SpaceAction } from '../types';
import { cloneObject, COMPOSER_SPACE_LOCK, getNestedObjects } from '../util';

// TODO(wittjosiah): Remove.
const SPACE_MAX_OBJECTS = 500;

type IntentResolverOptions = {
  context: PluginContext;
  createInvitationUrl: (invitationCode: string) => string;
  observability?: boolean;
};

export default ({ context, observability, createInvitationUrl }: IntentResolverOptions) => {
  const resolve = (typename: string) =>
    context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: SpaceAction.OpenCreateSpace,
      resolve: () => ({
        intents: [
          createIntent(LayoutAction.UpdateDialog, {
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
      resolve: async ({ name, hue, icon, edgeReplication }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const space = await client.spaces.create({ name, hue, icon });
        if (edgeReplication) {
          await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
        }
        await space.waitUntilReady();
        const collection = Obj.make(DataType.Collection, { objects: [] });
        space.properties[Type.getTypename(DataType.Collection)] = Ref.make(collection);

        if (Migrations.versionProperty) {
          space.properties[Migrations.versionProperty] = Migrations.targetVersion;
        }

        return {
          data: {
            id: space.id,
            subject: [space.id],
            space,
          },
          intents: [
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
          createIntent(LayoutAction.UpdateDialog, {
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
          createIntent(LayoutAction.Open, {
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
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
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
                invitation.subscribe((invitation) => {
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
            createIntent(LayoutAction.UpdatePopover, {
              part: 'popover',
              subject: POPOVER_RENAME_SPACE,
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
          createIntent(LayoutAction.Open, {
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
      intent: SpaceAction.OpenCreateObject,
      resolve: ({ target, navigable = true }) => {
        const state = context.getCapability(SpaceCapabilities.State);

        return {
          intents: [
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: CREATE_OBJECT_DIALOG,
              options: {
                blockAlign: 'start',
                props: {
                  target,
                  shouldNavigate: navigable
                    ? (object: Obj.Any) => !Obj.instanceOf(DataType.Collection, object) || state.navigableCollections
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
        const space = isSpace(target) ? target : getSpace(target);
        invariant(space, 'Space not found.');

        if (space.db.coreDatabase.getAllObjectIds().length >= SPACE_MAX_OBJECTS) {
          return {
            error: new Error('Space limit reached.'),
            intents: [
              createIntent(LayoutAction.AddToast, {
                part: 'toast',
                subject: {
                  id: `${SPACE_PLUGIN}/space-limit`,
                  title: ['space limit label', { ns: SPACE_PLUGIN }],
                  description: ['space limit description', { ns: SPACE_PLUGIN }],
                  duration: 5_000,
                  icon: 'ph--warning--regular',
                  actionLabel: ['remove deleted objects label', { ns: SPACE_PLUGIN }],
                  actionAlt: ['remove deleted objects alt', { ns: SPACE_PLUGIN }],
                  closeLabel: ['close label', { ns: 'os' }],
                  onAction: () => space.db.coreDatabase.unlinkDeletedObjects(),
                },
              }),
              ...(observability
                ? [
                    createIntent(ObservabilityAction.SendEvent, {
                      name: 'space.limit',
                      properties: {
                        spaceId: space.id,
                      },
                    }),
                  ]
                : []),
            ],
          };
        }

        if (Obj.instanceOf(DataType.Collection, target)) {
          target.objects.push(Ref.make(object));
        } else if (isSpace(target) && hidden) {
          space.db.add(object);
        } else if (isSpace(target)) {
          const collection = space.properties[Type.getTypename(DataType.Collection)]?.target;
          if (Obj.instanceOf(DataType.Collection, collection)) {
            collection.objects.push(Ref.make(object));
          } else {
            // TODO(wittjosiah): Can't add non-echo objects by including in a collection because of types.
            const collection = Obj.make(DataType.Collection, { objects: [Ref.make(object)] });
            space.properties[Type.getTypename(DataType.Collection)] = Ref.make(collection);
          }
        }

        return {
          data: {
            id: fullyQualifiedId(object),
            subject: [fullyQualifiedId(object)],
            object,
          },
          intents: [
            ...(observability
              ? [
                  createIntent(ObservabilityAction.SendEvent, {
                    name: 'space.object.add',
                    properties: {
                      spaceId: space.id,
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
      resolve: ({ space, schema, source, target, fields }) => {
        const relation = space.db.add(
          Obj.make(schema, {
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
        const layout = context.getCapability(Capabilities.Layout);

        // All objects must be a member of the same space.
        const space = getSpace(objects[0]);
        invariant(space && objects.every((obj) => Obj.isObject(obj) && getSpace(obj) === space));
        const openObjectIds = new Set<string>(layout.active);

        if (!undo) {
          const parentCollection: DataType.Collection =
            target ?? space.properties[Type.getTypename(DataType.Collection)]?.target;
          const nestedObjectsList = await Promise.all(objects.map((obj) => getNestedObjects(obj, resolve)));

          const deletionData = {
            objects,
            parentCollection,
            indices: objects.map((obj) =>
              Obj.instanceOf(DataType.Collection, parentCollection)
                ? parentCollection.objects.findIndex((object) => object.target === obj)
                : -1,
            ),
            nestedObjectsList,
            wasActive: objects
              .flatMap((obj, i) => [obj, ...nestedObjectsList[i]])
              .map((obj) => fullyQualifiedId(obj))
              .filter((id) => openObjectIds.has(id)),
          } satisfies SpaceAction.DeletionData;

          if (Obj.instanceOf(DataType.Collection, deletionData.parentCollection)) {
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

          const undoMessageKey = objects.some((obj) => Obj.instanceOf(DataType.Collection, obj))
            ? 'collection deleted label'
            : objects.length > 1
              ? 'objects deleted label'
              : 'object deleted label';

          return {
            undoable: {
              // TODO(ZaymonFC): Pluralize if more than one object.
              message: [undoMessageKey, { ns: SPACE_PLUGIN }],
              data: { deletionData },
            },
            intents:
              deletionData.wasActive.length > 0
                ? [
                    createIntent(LayoutAction.Close, {
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
            Obj.instanceOf(DataType.Collection, deletionData.parentCollection)
          ) {
            // Restore the object to the space.
            const restoredObjects = deletionData.objects.map((obj: Type.Expando) => space.db.add(obj));

            // Restore nested objects to the space.
            deletionData.nestedObjectsList.flat().forEach((obj: Type.Expando) => {
              space.db.add(obj);
            });

            deletionData.indices.forEach((index: number, i: number) => {
              if (index !== -1) {
                deletionData.parentCollection.objects.splice(index, 0, Ref.make(restoredObjects[i] as Type.Expando));
              }
            });

            return {
              intents:
                deletionData.wasActive.length > 0
                  ? [
                      createIntent(LayoutAction.Open, {
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
          createIntent(LayoutAction.UpdatePopover, {
            part: 'popover',
            subject: POPOVER_RENAME_OBJECT,
            options: {
              anchorId: `dxos.org/ui/${caller}/${fullyQualifiedId(object)}`,
              props: object,
            },
          }),
        ],
      }),
    }),
    createResolver({
      intent: SpaceAction.DuplicateObject,
      resolve: async ({ object, target }) => {
        const space = isSpace(target) ? target : getSpace(target);
        invariant(space, 'Space not found.');

        const newObject = await cloneObject(object, resolve, space);
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
        data: { object: Obj.make(DataType.Collection, { name, objects: [] }) },
      }),
    }),
  ]);
};
