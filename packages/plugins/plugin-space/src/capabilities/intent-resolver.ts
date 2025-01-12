//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  createResolver,
  firstIdInPart,
  LayoutAction,
  NavigationAction,
  openIds,
  type PluginsContext,
} from '@dxos/app-framework';
import { type Expando, getTypename, type HasId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { create, makeRef, type ReactiveObject } from '@dxos/live-object';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { isSpace, getSpace, SpaceState, type Space, fullyQualifiedId, isEchoObject } from '@dxos/react-client/echo';

import { SpaceCapabilities } from './capabilities';
import {
  CREATE_SPACE_DIALOG,
  JOIN_DIALOG,
  SPACE_SETTINGS_DIALOG,
  type SpaceSettingsDialogProps,
  type JoinDialogProps,
  POPOVER_RENAME_SPACE,
  CREATE_OBJECT_DIALOG,
  type CreateObjectDialogProps,
  POPOVER_RENAME_OBJECT,
} from '../components';
import { SPACE_PLUGIN } from '../meta';
import { CollectionAction, CollectionType, SpaceAction } from '../types';
import { cloneObject, COMPOSER_SPACE_LOCK, getNestedObjects } from '../util';

const SPACE_MAX_OBJECTS = 500;

type IntentResolverOptions = {
  createInvitationUrl: (invitationCode: string) => string;
  context: PluginsContext;
};

export default ({ createInvitationUrl, context }: IntentResolverOptions) => {
  const resolve = (typename: string) =>
    context.requestCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return contributes(Capabilities.IntentResolver, [
    createResolver(SpaceAction.OpenCreateSpace, () => ({
      intents: [
        createIntent(LayoutAction.SetLayout, {
          element: 'dialog',
          component: CREATE_SPACE_DIALOG,
          dialogBlockAlign: 'start',
        }),
      ],
    })),
    createResolver(SpaceAction.Create, async ({ name, edgeReplication }) => {
      const client = context.requestCapability(ClientCapabilities.Client);
      const space = await client.spaces.create({ name });
      if (edgeReplication) {
        await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
      }
      await space.waitUntilReady();
      const collection = create(CollectionType, { objects: [], views: {} });
      space.properties[CollectionType.typename] = makeRef(collection);

      if (Migrations.versionProperty) {
        space.properties[Migrations.versionProperty] = Migrations.targetVersion;
      }

      return {
        data: {
          space,
          id: space.id,
          activeParts: { main: [space.id] },
        },
        intents: [
          createIntent(ObservabilityAction.SendEvent, {
            name: 'space.create',
            properties: {
              spaceId: space.id,
            },
          }),
        ],
      };
    }),
    createResolver(SpaceAction.Join, ({ invitationCode }) => ({
      intents: [
        createIntent(LayoutAction.SetLayout, {
          element: 'dialog',
          component: JOIN_DIALOG,
          dialogBlockAlign: 'start',
          subject: {
            initialInvitationCode: invitationCode,
          } satisfies Partial<JoinDialogProps>,
        }),
      ],
    })),
    createResolver(
      SpaceAction.Share,
      ({ space }) => {
        const location = context.requestCapability(Capabilities.Location);
        const layout = context.requestCapability(Capabilities.Layout);
        const current = firstIdInPart(location.active, layout.layoutMode === 'solo' ? 'solo' : 'main');
        const target = current?.startsWith(space.id) ? current : undefined;

        return {
          intents: [
            createIntent(LayoutAction.SetLayout, {
              element: 'dialog',
              component: SPACE_SETTINGS_DIALOG,
              dialogBlockAlign: 'start',
              subject: {
                space,
                target,
                initialTab: 'members',
                createInvitationUrl,
              } satisfies Partial<SpaceSettingsDialogProps>,
            }),
            createIntent(ObservabilityAction.SendEvent, {
              name: 'space.share',
              properties: {
                space: space.id,
              },
            }),
          ],
        };
      },
      { filter: (data): data is { space: Space } => !data.space.properties[COMPOSER_SPACE_LOCK] },
    ),
    createResolver(SpaceAction.Lock, ({ space }) => {
      space.properties[COMPOSER_SPACE_LOCK] = true;
      return {
        intents: [
          createIntent(ObservabilityAction.SendEvent, {
            name: 'space.lock',
            properties: {
              spaceId: space.id,
            },
          }),
        ],
      };
    }),
    createResolver(SpaceAction.Unlock, ({ space }) => {
      space.properties[COMPOSER_SPACE_LOCK] = false;
      return {
        intents: [
          createIntent(ObservabilityAction.SendEvent, {
            name: 'space.unlock',
            properties: {
              spaceId: space.id,
            },
          }),
        ],
      };
    }),
    createResolver(SpaceAction.Rename, ({ caller, space }) => {
      return {
        intents: [
          createIntent(LayoutAction.SetLayout, {
            element: 'popover',
            anchorId: `dxos.org/ui/${caller}/${space.id}`,
            component: POPOVER_RENAME_SPACE,
            subject: space,
          }),
        ],
      };
    }),
    createResolver(SpaceAction.OpenSettings, ({ space }) => {
      return {
        intents: [
          createIntent(LayoutAction.SetLayout, {
            element: 'dialog',
            component: SPACE_SETTINGS_DIALOG,
            dialogBlockAlign: 'start',
            subject: {
              space,
              initialTab: 'settings',
              createInvitationUrl,
            } satisfies Partial<SpaceSettingsDialogProps>,
          }),
        ],
      };
    }),
    createResolver(SpaceAction.Open, async ({ space }) => {
      await space.open();
    }),
    createResolver(SpaceAction.Close, async ({ space }) => {
      await space.close();
    }),
    createResolver(SpaceAction.Migrate, async ({ space, version }) => {
      const state = context.requestCapability(SpaceCapabilities.MutableState);

      if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
        state.sdkMigrationRunning[space.id] = true;
        await space.internal.migrate();
        state.sdkMigrationRunning[space.id] = false;
      }
      const result = await Migrations.migrate(space, version);
      return {
        data: result,
        intents: [
          createIntent(ObservabilityAction.SendEvent, {
            name: 'space.migrate',
            properties: {
              spaceId: space.id,
              version,
            },
          }),
        ],
      };
    }),
    createResolver(SpaceAction.OpenCreateObject, ({ target, navigable = true }) => {
      const state = context.requestCapability(SpaceCapabilities.State);

      return {
        intents: [
          createIntent(LayoutAction.SetLayout, {
            element: 'dialog',
            component: CREATE_OBJECT_DIALOG,
            dialogBlockAlign: 'start',
            subject: {
              target,
              shouldNavigate: navigable
                ? (object: ReactiveObject<any>) => !(object instanceof CollectionType) || state.navigableCollections
                : () => false,
            } satisfies Partial<CreateObjectDialogProps>,
          }),
        ],
      };
    }),
    createResolver(SpaceAction.AddObject, async ({ target, object }) => {
      const space = isSpace(target) ? target : getSpace(target);
      invariant(space, 'Space not found.');

      if (space.db.coreDatabase.getAllObjectIds().length >= SPACE_MAX_OBJECTS) {
        return {
          error: new Error('Space limit reached.'),
          intents: [
            createIntent(LayoutAction.SetLayout, {
              element: 'toast',
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
            createIntent(ObservabilityAction.SendEvent, {
              name: 'space.limit',
              properties: {
                spaceId: space.id,
              },
            }),
          ],
        };
      }

      if (target instanceof CollectionType) {
        target.objects.push(makeRef(object as HasId));
      } else if (isSpace(target)) {
        const collection = space.properties[CollectionType.typename]?.target;
        if (collection instanceof CollectionType) {
          collection.objects.push(makeRef(object as HasId));
        } else {
          // TODO(wittjosiah): Can't add non-echo objects by including in a collection because of types.
          const collection = create(CollectionType, { objects: [makeRef(object as HasId)], views: {} });
          space.properties[CollectionType.typename] = makeRef(collection);
        }
      }

      return {
        data: {
          id: fullyQualifiedId(object),
          object: object as HasId,
          activeParts: { main: [fullyQualifiedId(object)] },
        },
        intents: [
          createIntent(ObservabilityAction.SendEvent, {
            name: 'space.object.add',
            properties: {
              spaceId: space.id,
              objectId: object.id,
              typename: getTypename(object),
            },
          }),
        ],
      };
    }),
    createResolver(SpaceAction.RemoveObjects, async ({ objects, target, deletionData }, undo) => {
      const location = context.requestCapability(Capabilities.Location);

      // All objects must be a member of the same space.
      const space = getSpace(objects[0]);
      invariant(space && objects.every((obj) => isEchoObject(obj) && getSpace(obj) === space));
      const openObjectIds = new Set<string>(openIds(location.active));

      if (!undo) {
        const parentCollection: CollectionType = target ?? space.properties[CollectionType.typename]?.target;
        const nestedObjectsList = await Promise.all(objects.map((obj) => getNestedObjects(obj, resolve)));

        const deletionData = {
          objects,
          parentCollection,
          indices: objects.map((obj) =>
            parentCollection instanceof CollectionType
              ? parentCollection.objects.findIndex((object) => object.target === obj)
              : -1,
          ),
          nestedObjectsList,
          wasActive: objects
            .flatMap((obj, i) => [obj, ...nestedObjectsList[i]])
            .map((obj) => fullyQualifiedId(obj))
            .filter((id) => openObjectIds.has(id)),
        } satisfies SpaceAction.DeletionData;

        if (deletionData.parentCollection instanceof CollectionType) {
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

        const undoMessageKey = objects.some((obj) => obj instanceof CollectionType)
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
              ? [createIntent(NavigationAction.Close, { activeParts: { main: deletionData.wasActive } })]
              : undefined,
        };
      } else {
        if (
          deletionData?.objects?.length &&
          deletionData.objects.every(isEchoObject) &&
          deletionData.parentCollection instanceof CollectionType
        ) {
          // Restore the object to the space.
          const restoredObjects = deletionData.objects.map((obj: Expando) => space.db.add(obj));

          // Restore nested objects to the space.
          deletionData.nestedObjectsList.flat().forEach((obj: Expando) => {
            space.db.add(obj);
          });

          deletionData.indices.forEach((index: number, i: number) => {
            if (index !== -1) {
              deletionData.parentCollection.objects.splice(index, 0, makeRef(restoredObjects[i] as Expando));
            }
          });

          return {
            intents:
              deletionData.wasActive.length > 0
                ? [
                    createIntent(NavigationAction.Open, {
                      activeParts: { main: deletionData.wasActive as string[] },
                    }),
                  ]
                : undefined,
          };
        }
      }
    }),
    createResolver(SpaceAction.RenameObject, async ({ object, caller }) => ({
      intents: [
        createIntent(LayoutAction.SetLayout, {
          element: 'popover',
          anchorId: `dxos.org/ui/${caller}/${fullyQualifiedId(object)}`,
          component: POPOVER_RENAME_OBJECT,
          subject: object,
        }),
      ],
    })),
    createResolver(SpaceAction.DuplicateObject, async ({ object, target }) => {
      const space = isSpace(target) ? target : getSpace(target);
      invariant(space, 'Space not found.');

      const newObject = await cloneObject(object, resolve, space);
      return {
        intents: [createIntent(SpaceAction.AddObject, { object: newObject, target })],
      };
    }),
    createResolver(SpaceAction.WaitForObject, async ({ id }) => {
      const state = context.requestCapability(SpaceCapabilities.MutableState);
      state.awaiting = id;
    }),
    createResolver(CollectionAction.Create, async ({ name }) => ({
      data: { object: create(CollectionType, { name, objects: [], views: {} }) },
    })),
  ]);
};
