//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, FollowupScheduler, OperationResolver, UndoMapping } from '@dxos/app-framework';
import { SpaceState, getSpace } from '@dxos/client/echo';
import { Database, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { EchoDatabaseImpl, Serializer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention/types';
import { iconValues } from '@dxos/react-ui-pickers/icons';
import { Collection, ProjectionModel, getTypenameFromQuery } from '@dxos/schema';
import { hues } from '@dxos/ui-theme';

import { type JoinDialogProps } from '../../components';
import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  JOIN_DIALOG,
  OBJECT_RENAME_POPOVER,
  SPACE_RENAME_POPOVER,
} from '../../constants';
import { SpaceEvents } from '../../events';
import { SpaceCapabilities, SpaceOperation } from '../../types';
import { COMPOSER_SPACE_LOCK, cloneObject, getNestedObjects } from '../../util';

type OperationResolverOptions = {
  context: Capability.PluginContext;
  createInvitationUrl: (invitationCode: string) => string;
  observability?: boolean;
};

export default Capability.makeModule(({ context, createInvitationUrl, observability }: OperationResolverOptions) =>
  Effect.sync(() => {
    const resolve = (typename: string) =>
      context.getCapabilities(Common.Capability.Metadata).find(({ id }: { id: string }) => id === typename)?.metadata ??
      {};

    return [
      Capability.contributes(Common.Capability.UndoMapping, [
        UndoMapping.make({
          operation: SpaceOperation.DeleteField,
          inverse: SpaceOperation.RestoreField,
          deriveContext: (input, output) => ({
            view: input.view,
            field: output.field,
            props: output.props,
            index: output.index,
          }),
          message: ['field deleted label', { ns: 'dxos.org/plugin/space' }],
        }),
        UndoMapping.make({
          operation: SpaceOperation.RemoveObjects,
          inverse: SpaceOperation.RestoreObjects,
          deriveContext: (_input, output) => ({
            objects: output.objects,
            parentCollection: output.parentCollection,
            indices: output.indices,
            nestedObjectsList: output.nestedObjectsList,
            wasActive: output.wasActive,
          }),
          message: (input, _output) => {
            const ns = Obj.getTypename(input.objects[0]);
            return ns && input.objects.length === 1
              ? ['object deleted label', { ns }]
              : ['objects deleted label', { ns: 'plugin-space' }];
          },
        }),
      ]),
      Capability.contributes(Common.Capability.OperationResolver, [
        //
        // Open
        //
        OperationResolver.make({
          operation: SpaceOperation.Open,
          handler: (input) =>
            Effect.promise(async () => {
              await input.space.open();
            }),
        }),

        //
        // Close
        //
        OperationResolver.make({
          operation: SpaceOperation.Close,
          handler: (input) =>
            Effect.promise(async () => {
              await input.space.close();
            }),
        }),

        //
        // Join
        //
        OperationResolver.make({
          operation: SpaceOperation.Join,
          handler: (input) =>
            context.getCapability(Common.Capability.OperationInvoker).invoke(Common.LayoutOperation.UpdateDialog, {
              subject: JOIN_DIALOG,
              blockAlign: 'start',
              props: {
                initialInvitationCode: input.invitationCode,
                onDone: input.onDone,
              } satisfies Partial<JoinDialogProps>,
            }),
        }),

        //
        // WaitForObject
        //
        OperationResolver.make({
          operation: SpaceOperation.WaitForObject,
          handler: (input) =>
            Effect.sync(() => {
              const state = context.getCapability(SpaceCapabilities.MutableState);
              state.awaiting = input.id;
            }),
        }),

        //
        // OpenSettings
        //
        OperationResolver.make({
          operation: SpaceOperation.OpenSettings,
          handler: (input) =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              yield* invoke(Common.LayoutOperation.Open, {
                subject: [`properties-settings${ATTENDABLE_PATH_SEPARATOR}${input.space.id}`],
                workspace: input.space.id,
              });
            }),
        }),

        //
        // RemoveObjects
        //
        OperationResolver.make({
          operation: SpaceOperation.RemoveObjects,
          handler: (input) =>
            Effect.gen(function* () {
              const layout = context.getCapability(Common.Capability.Layout);
              const objects = input.objects as Obj.Any[];

              // All objects must be a member of the same space.
              const space = getSpace(objects[0]);
              invariant(space && objects.every((obj) => Obj.isObject(obj) && getSpace(obj) === space));
              const openObjectIds = new Set<string>(layout.active);

              const parentCollection: Collection.Collection =
                input.target ?? space.properties[Collection.Collection.typename]?.target;

              const nestedObjectsList = yield* Effect.promise(() =>
                Promise.all(objects.map((obj) => getNestedObjects(obj, resolve))),
              );

              // Capture indices before removal.
              const indices = objects.map((obj) =>
                Obj.instanceOf(Collection.Collection, parentCollection)
                  ? parentCollection.objects.findIndex((ref) => ref.target === obj)
                  : -1,
              );

              // Close objects that were open.
              const wasActive = objects
                .flatMap((obj, i) => [obj, ...nestedObjectsList[i]])
                .filter((obj) => Obj.isObject(obj) && openObjectIds.has(Obj.getDXN(obj).toString()))
                .map((obj) => Obj.getDXN(obj).toString());

              for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                const nestedObjects = nestedObjectsList[i];

                // Remove from parent collection.
                const index = parentCollection.objects.findIndex((ref) => ref.target === obj);
                if (index !== -1) {
                  parentCollection.objects.splice(index, 1);
                }

                // Delete nested objects.
                for (const nestedObject of nestedObjects) {
                  if (Obj.isObject(nestedObject)) {
                    Obj.getDatabase(nestedObject)?.remove(nestedObject);
                  } else if (Relation.isRelation(nestedObject)) {
                    const db = Obj.getDatabase(Relation.getSource(nestedObject));
                    db?.remove(nestedObject);
                  }
                }

                // Delete the object.
                const db = Obj.getDatabase(obj);
                db?.remove(obj);
              }

              if (wasActive.length > 0) {
                const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
                yield* invoke(Common.LayoutOperation.Close, { subject: wasActive });
              }

              // Return data needed for undo.
              return {
                objects,
                parentCollection,
                indices,
                nestedObjectsList,
                wasActive,
              };
            }),
        }),

        //
        // DeleteField
        //
        OperationResolver.make({
          operation: SpaceOperation.DeleteField,
          handler: (input) =>
            Effect.promise(async () => {
              const view = input.view as any;
              const db = Obj.getDatabase(view);
              invariant(db);
              const typename = getTypenameFromQuery(view.query.ast);
              invariant(typename);
              const schema = await db.schemaRegistry.query({ typename }).firstOrUndefined();
              invariant(schema);
              const projection = new ProjectionModel(schema.jsonSchema, view.projection);
              const { deleted, index } = projection.deleteFieldProjection(input.fieldId);

              // Return data needed for undo.
              return {
                field: deleted.field,
                props: deleted.props,
                index,
              };
            }),
        }),

        //
        // OpenCreateObject
        //
        OperationResolver.make({
          operation: SpaceOperation.OpenCreateObject,
          handler: (input) =>
            Effect.gen(function* () {
              const state = context.getCapability(SpaceCapabilities.State);
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              const navigable = input.navigable ?? true;
              yield* invoke(Common.LayoutOperation.UpdateDialog, {
                subject: CREATE_OBJECT_DIALOG,
                blockAlign: 'start',
                props: {
                  target: input.target,
                  views: input.views,
                  typename: input.typename,
                  initialFormValues: input.initialFormValues,
                  onCreateObject: input.onCreateObject,
                  shouldNavigate: navigable
                    ? (object: Obj.Any) => {
                        const isCollection = Obj.instanceOf(Collection.Collection, object);
                        const isSystemCollection = Obj.instanceOf(Collection.Managed, object);
                        return (!isCollection && !isSystemCollection) || state.navigableCollections;
                      }
                    : () => false,
                },
              });
            }),
        }),

        //
        // AddObject
        //
        OperationResolver.make({
          operation: SpaceOperation.AddObject,
          handler: (input) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              const target = input.target as any;
              const object = input.object as Obj.Any;
              const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
              invariant(db, 'Database not found.');

              yield* Collection.add({
                object,
                target: Database.isDatabase(target) ? undefined : target,
                hidden: input.hidden,
              }).pipe(Effect.provide(Database.Service.layer(db)));

              yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                name: 'space.object.add',
                properties: {
                  spaceId: db.spaceId,
                  objectId: object.id,
                },
              });

              return {
                id: Obj.getDXN(object).toString(),
                subject: [Obj.getDXN(object).toString()],
                object,
              };
            }),
        }),

        //
        // Share
        //
        OperationResolver.make({
          operation: SpaceOperation.Share,
          handler: (input) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              const { space, type, authMethod, multiUse, target } = input;
              const invitation = space.share({ type, authMethod, multiUse, target });

              yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                name: 'space.share',
                properties: {
                  spaceId: space.id,
                },
              });

              return invitation;
            }),
        }),

        //
        // Lock
        // TODO(wittjosiah): This appears to be unused.
        //
        OperationResolver.make({
          operation: SpaceOperation.Lock,
          handler: ({ space }) =>
            Effect.gen(function* () {
              space.properties[COMPOSER_SPACE_LOCK] = true;

              if (observability) {
                const scheduler = yield* FollowupScheduler.Service;
                yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                  name: 'space.lock',
                  properties: { spaceId: space.id },
                });
              }
            }),
        }),

        //
        // Unlock
        // TODO(wittjosiah): This appears to be unused.
        //
        OperationResolver.make({
          operation: SpaceOperation.Unlock,
          handler: ({ space }) =>
            Effect.gen(function* () {
              space.properties[COMPOSER_SPACE_LOCK] = false;

              if (observability) {
                const scheduler = yield* FollowupScheduler.Service;
                yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                  name: 'space.unlock',
                  properties: { spaceId: space.id },
                });
              }
            }),
        }),

        //
        // OpenCreateSpace
        //
        OperationResolver.make({
          operation: SpaceOperation.OpenCreateSpace,
          handler: () =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              yield* invoke(Common.LayoutOperation.UpdateDialog, {
                subject: CREATE_SPACE_DIALOG,
                blockAlign: 'start',
              });
            }),
        }),

        //
        // Create
        //
        OperationResolver.make({
          operation: SpaceOperation.Create,
          handler: ({ name, hue: hue_, icon: icon_, edgeReplication }) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              const client = context.getCapability(ClientCapabilities.Client);
              const hue = hue_ ?? hues[Math.floor(Math.random() * hues.length)];
              const icon = icon_ ?? iconValues[Math.floor(Math.random() * iconValues.length)];
              const space = yield* Effect.promise(() => client.spaces.create({ name, hue, icon }));
              if (edgeReplication) {
                yield* Effect.promise(() =>
                  space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED),
                );
              }
              yield* Effect.promise(() => space.waitUntilReady());

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
              yield* context.activate(SpaceEvents.SpaceCreated);
              const onCreateSpaceCallbacks = context.getCapabilities(SpaceCapabilities.OnCreateSpace);
              yield* Effect.all(
                onCreateSpaceCallbacks.map((onCreateSpace) =>
                  onCreateSpace({ space, isDefault: false, rootCollection: collection }),
                ),
              );

              if (observability) {
                yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                  name: 'space.create',
                  properties: { spaceId: space.id },
                });
              }

              return { id: space.id, subject: [space.id], space };
            }),
        }),

        //
        // Migrate
        //
        OperationResolver.make({
          operation: SpaceOperation.Migrate,
          handler: (input) =>
            Effect.gen(function* () {
              const state = context.getCapability(SpaceCapabilities.MutableState);
              const scheduler = yield* FollowupScheduler.Service;
              const { space, version: targetVersion } = input;

              if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
                state.sdkMigrationRunning[space.id] = true;
                yield* Effect.promise(() => space.internal.migrate());
                state.sdkMigrationRunning[space.id] = false;
              }
              const result = yield* Effect.promise(() => Migrations.migrate(space, targetVersion));

              yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                name: 'space.migrate',
                properties: {
                  spaceId: space.id,
                  targetVersion,
                  version: Migrations.versionProperty ? space.properties[Migrations.versionProperty] : undefined,
                },
              });

              return result;
            }),
        }),

        //
        // Snapshot
        //
        OperationResolver.make({
          operation: SpaceOperation.Snapshot,
          handler: (input) =>
            Effect.promise(async () => {
              const db = input.db as any;
              invariant(db instanceof EchoDatabaseImpl, 'Database must be an instance of EchoDatabaseImpl');
              const backup = await new Serializer().export(db, input.query && Query.fromAst(input.query));
              return {
                snapshot: new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
              };
            }),
        }),

        //
        // Rename
        //
        OperationResolver.make({
          operation: SpaceOperation.Rename,
          handler: (input) =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              yield* invoke(Common.LayoutOperation.UpdatePopover, {
                subject: SPACE_RENAME_POPOVER,
                anchorId: `dxos.org/ui/${input.caller}/${input.space.id}`,
                props: input.space,
              });
            }),
        }),

        //
        // RenameObject
        //
        OperationResolver.make({
          operation: SpaceOperation.RenameObject,
          handler: (input) =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              const object = input.object as Obj.Any;
              yield* invoke(Common.LayoutOperation.UpdatePopover, {
                subject: OBJECT_RENAME_POPOVER,
                anchorId: `dxos.org/ui/${input.caller}/${Obj.getDXN(object).toString()}`,
                props: object,
              });
            }),
        }),

        //
        // OpenMembers
        //
        OperationResolver.make({
          operation: SpaceOperation.OpenMembers,
          handler: (input) =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              yield* invoke(Common.LayoutOperation.Open, {
                subject: [`members-settings${ATTENDABLE_PATH_SEPARATOR}${input.space.id}`],
                workspace: input.space.id,
              });
            }),
        }),

        //
        // GetShareLink
        //
        OperationResolver.make({
          operation: SpaceOperation.GetShareLink,
          handler: (input) =>
            Effect.gen(function* () {
              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              const { Invitation, InvitationEncoder } = yield* Effect.promise(
                () => import('@dxos/react-client/invitations'),
              );

              const invitation = yield* invoke(SpaceOperation.Share, {
                space: input.space,
                type: Invitation.Type.DELEGATED,
                authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
                multiUse: true,
                target: input.target,
              });

              // NOTE: Delegated invitations are invalid until the connecting state when keys are filled in.
              const invitationCode = yield* Effect.tryPromise(
                () =>
                  new Promise<string>((resolve) => {
                    invitation.subscribe((inv) => {
                      if (inv.state === Invitation.State.CONNECTING) {
                        resolve(InvitationEncoder.encode(inv));
                      }
                    });
                  }),
              );
              const url = createInvitationUrl(invitationCode);
              if (input.copyToClipboard) {
                yield* Effect.tryPromise(() => navigator.clipboard.writeText(url));
              }
              return url;
            }),
        }),

        //
        // UseStaticSchema
        //
        OperationResolver.make({
          operation: SpaceOperation.UseStaticSchema,
          handler: (input) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              const db = input.db as Database.Database;
              const client = context.getCapability(ClientCapabilities.Client) as any;
              const schema: any = yield* Effect.promise(() =>
                client.graph.schemaRegistry.query({ typename: input.typename, location: ['runtime'] }).first(),
              );
              const space = client.spaces.get(db.spaceId);
              invariant(space, 'Space not found');

              if (!space.properties.staticRecords) {
                space.properties.staticRecords = [];
              }

              if (!space.properties.staticRecords.includes(input.typename)) {
                space.properties.staticRecords.push(input.typename);
              }

              yield* Effect.promise(() => runAndForwardErrors(context.activate(SpaceEvents.SchemaAdded)));
              const onSchemaAdded = context.getCapabilities(SpaceCapabilities.OnSchemaAdded);
              yield* Effect.all(
                onSchemaAdded.map((callback) => callback({ db, schema, show: input.show })),
                { concurrency: 'unbounded' },
              );

              yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                name: 'space.schema.use',
                properties: {
                  spaceId: space.id,
                  typename: Type.getTypename(schema),
                },
              });

              return {};
            }),
        }),

        //
        // AddSchema
        //
        OperationResolver.make({
          operation: SpaceOperation.AddSchema,
          handler: (input) =>
            Effect.gen(function* () {
              const scheduler = yield* FollowupScheduler.Service;
              const db = input.db as any;
              const schemas = (yield* Effect.promise(() => db.schemaRegistry.register([input.schema]))) as any[];
              const schema = schemas[0];
              if (input.name) {
                schema.storedSchema.name = input.name;
              }
              if (input.typename) {
                schema.storedSchema.typename = input.typename;
              }
              if (input.version) {
                schema.storedSchema.version = input.version;
              }

              yield* Effect.promise(() => runAndForwardErrors(context.activate(SpaceEvents.SchemaAdded)));
              const onSchemaAdded = context.getCapabilities(SpaceCapabilities.OnSchemaAdded);
              yield* Effect.all(
                onSchemaAdded.map((callback) => callback({ db, schema, show: input.show })),
                { concurrency: 'unbounded' },
              );

              yield* scheduler.schedule(ObservabilityOperation.SendEvent, {
                name: 'space.schema.add',
                properties: {
                  spaceId: db.spaceId,
                  objectId: schema.id,
                  typename: schema.typename,
                },
              });

              return { id: schema.id, object: schema.storedSchema, schema };
            }),
        }),

        //
        // AddRelation
        //
        OperationResolver.make({
          operation: SpaceOperation.AddRelation,
          handler: (input) =>
            Effect.sync(() => {
              const db = input.db as Database.Database;
              const relation = db.add(
                Relation.make(input.schema, {
                  [Relation.Source]: input.source,
                  [Relation.Target]: input.target,
                  ...input.fields,
                }),
              );
              return { relation };
            }),
        }),

        //
        // DuplicateObject
        // TODO(wittjosiah): This appears to be unused.
        //
        OperationResolver.make({
          operation: SpaceOperation.DuplicateObject,
          handler: (input) =>
            Effect.promise(async () => {
              const object = input.object as Obj.Any;
              const db = Obj.getDatabase(object);
              invariant(db, 'Database not found.');
              const newObject = await cloneObject(object, resolve, db);

              const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
              await runAndForwardErrors(invoke(SpaceOperation.AddObject, { object: newObject, target: db }));
            }),
        }),

        //
        // RestoreField (inverse of DeleteField)
        //
        OperationResolver.make({
          operation: SpaceOperation.RestoreField,
          handler: (input) =>
            Effect.promise(async () => {
              const view = input.view as any;
              const db = Obj.getDatabase(view);
              invariant(db);
              const typename = getTypenameFromQuery(view.query.ast);
              invariant(typename);
              const schema = await db.schemaRegistry.query({ typename }).firstOrUndefined();
              invariant(schema);
              const projection = new ProjectionModel(schema.jsonSchema, view.projection);
              projection.setFieldProjection({ field: input.field, props: input.props }, input.index);
            }),
        }),

        //
        // RestoreObjects (inverse of RemoveObjects)
        //
        OperationResolver.make({
          operation: SpaceOperation.RestoreObjects,
          handler: (input) =>
            Effect.gen(function* () {
              const objects = input.objects as Obj.Any[];
              const parentCollection = input.parentCollection as Collection.Collection;
              const indices = input.indices as number[];
              const nestedObjectsList = input.nestedObjectsList as Obj.Any[][];
              const wasActive = input.wasActive as string[];

              // Get the space from the first object.
              const space = getSpace(objects[0]);
              invariant(space);

              // Restore objects to the space.
              const restoredObjects = objects.map((obj: Obj.Any) => space.db.add(obj));

              // Restore nested objects to the space.
              nestedObjectsList.flat().forEach((obj: Obj.Any) => {
                if (Obj.isObject(obj)) {
                  space.db.add(obj);
                } else if (Relation.isRelation(obj)) {
                  space.db.add(obj);
                }
              });

              // Restore objects to the parent collection at their original indices.
              indices.forEach((index: number, i: number) => {
                if (index !== -1) {
                  parentCollection.objects.splice(index, 0, Ref.make(restoredObjects[i] as Obj.Any));
                }
              });

              // Re-open objects that were active.
              if (wasActive.length > 0) {
                const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
                yield* invoke(Common.LayoutOperation.Open, { subject: wasActive });
              }
            }),
        }),
      ]),
    ];
  }),
);
