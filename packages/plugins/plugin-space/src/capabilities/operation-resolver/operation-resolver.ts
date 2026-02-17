//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin, UndoMapping } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { SpaceState, getSpace } from '@dxos/client/echo';
import { Database, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { EchoDatabaseImpl, Serializer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { Migrations } from '@dxos/migrations';
import { OperationResolver } from '@dxos/operation';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention/types';
import { iconValues } from '@dxos/react-ui-pickers/icons';
import { Collection, ProjectionModel, createEchoChangeCallback, getTypenameFromQuery } from '@dxos/schema';
import { hues } from '@dxos/ui-theme';

import { type JoinDialogProps } from '../../components';
import {
  CREATE_OBJECT_DIALOG,
  CREATE_SPACE_DIALOG,
  JOIN_DIALOG,
  OBJECT_RENAME_POPOVER,
  SPACE_RENAME_POPOVER,
} from '../../constants';
import { meta } from '../../meta';
import { SpaceEvents } from '../../types';
import { SpaceCapabilities, SpaceOperation } from '../../types';
import { COMPOSER_SPACE_LOCK, cloneObject, getNestedObjects } from '../../util';

type OperationResolverOptions = {
  createInvitationUrl: (invitationCode: string) => string;
  observability?: boolean;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: OperationResolverOptions) {
    const { createInvitationUrl, observability } = props!;
    const capabilityManager = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilityManager.getAll(AppCapabilities.Metadata).find(({ id }: { id: string }) => id === typename)?.metadata ??
      {};

    return [
      Capability.contributes(Capabilities.UndoMapping, [
        UndoMapping.make({
          operation: SpaceOperation.DeleteField,
          inverse: SpaceOperation.RestoreField,
          deriveContext: (input, output) => ({
            view: input.view,
            field: output.field,
            props: output.props,
            index: output.index,
          }),
          message: ['field deleted label', { ns: meta.id }],
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
              ? ['object deleted label', { ns: meta.id }]
              : ['objects deleted label', { ns: meta.id }];
          },
        }),
      ]),
      Capability.contributes(Capabilities.OperationResolver, [
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
          handler: Effect.fnUntraced(function* (input) {
            yield* Operation.invoke(LayoutOperation.UpdateDialog, {
              subject: JOIN_DIALOG,
              blockAlign: 'start',
              props: {
                initialInvitationCode: input.invitationCode,
                onDone: input.onDone,
              } satisfies Partial<JoinDialogProps>,
            });
          }),
        }),

        //
        // WaitForObject
        //
        OperationResolver.make({
          operation: SpaceOperation.WaitForObject,
          handler: Effect.fnUntraced(function* (input) {
            yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
              ...current,
              awaiting: input.id,
            }));
          }),
        }),

        //
        // OpenSettings
        //
        OperationResolver.make({
          operation: SpaceOperation.OpenSettings,
          handler: Effect.fnUntraced(function* (input) {
            yield* Operation.invoke(LayoutOperation.Open, {
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
          handler: Effect.fnUntraced(function* (input) {
            const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
            const objects = input.objects as Obj.Unknown[];

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
                Obj.change(parentCollection, (c) => {
                  c.objects.splice(index, 1);
                });
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
              yield* Operation.invoke(LayoutOperation.Close, { subject: wasActive });
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
          handler: Effect.fnUntraced(function* (input) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const view = input.view as any;
            const db = Obj.getDatabase(view);
            invariant(db);
            const typename = getTypenameFromQuery(view.query.ast);
            invariant(typename);
            const schema = yield* Effect.promise(() => db.schemaRegistry.query({ typename }).firstOrUndefined());
            invariant(schema);

            // Create projection with change callbacks that wrap in Obj.change().
            const projection = new ProjectionModel({
              registry,
              view,
              baseSchema: schema.jsonSchema,
              change: createEchoChangeCallback(view, schema),
            });

            const result = projection.deleteFieldProjection(input.fieldId);

            // Return data needed for undo.
            return {
              field: result.deleted.field,
              props: result.deleted.props,
              index: result.index,
            };
          }),
        }),

        //
        // OpenCreateObject
        //
        OperationResolver.make({
          operation: SpaceOperation.OpenCreateObject,
          handler: Effect.fnUntraced(function* (input) {
            const ephemeralState = yield* Capabilities.getAtomValue(SpaceCapabilities.EphemeralState);
            const navigable = input.navigable ?? true;
            yield* Operation.invoke(LayoutOperation.UpdateDialog, {
              subject: CREATE_OBJECT_DIALOG,
              blockAlign: 'start',
              props: {
                target: input.target,
                views: input.views,
                typename: input.typename,
                initialFormValues: input.initialFormValues,
                onCreateObject: input.onCreateObject,
                shouldNavigate: navigable
                  ? (object: Obj.Unknown) => {
                      const isCollection = Obj.instanceOf(Collection.Collection, object);
                      const isSystemCollection = Obj.instanceOf(Collection.Managed, object);
                      return (!isCollection && !isSystemCollection) || ephemeralState.navigableCollections;
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
          handler: Effect.fnUntraced(function* (input) {
            const target = input.target as any;
            const object = input.object as Obj.Unknown;
            const db = Database.isDatabase(target) ? target : Obj.getDatabase(target);
            invariant(db, 'Database not found.');

            yield* Collection.add({
              object,
              target: Database.isDatabase(target) ? undefined : target,
              hidden: input.hidden,
            }).pipe(Effect.provide(Database.layer(db)));

            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* (input) {
            const { space, type, authMethod, multiUse, target } = input;
            const invitation = space.share({ type, authMethod, multiUse, target });

            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* ({ space }) {
            Obj.change(space.properties, (p) => {
              p[COMPOSER_SPACE_LOCK] = true;
            });

            if (observability) {
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* ({ space }) {
            Obj.change(space.properties, (p) => {
              p[COMPOSER_SPACE_LOCK] = false;
            });

            if (observability) {
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* () {
            yield* Operation.invoke(LayoutOperation.UpdateDialog, {
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
          handler: Effect.fnUntraced(function* ({ name, hue: hue_, icon: icon_, edgeReplication }) {
            const client = yield* Capability.get(ClientCapabilities.Client);
            const hue = hue_ ?? hues[Math.floor(Math.random() * hues.length)];
            const icon = icon_ ?? iconValues[Math.floor(Math.random() * iconValues.length)];
            const space = yield* Effect.promise(() => client.spaces.create({ name, hue, icon }));
            if (edgeReplication) {
              yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
            }
            yield* Effect.promise(() => space.waitUntilReady());

            // Create root collection.
            const collection = Obj.make(Collection.Collection, { objects: [] });
            Obj.change(space.properties, (p) => {
              p[Collection.Collection.typename] = Ref.make(collection);
              // Set current migration version.
              if (Migrations.versionProperty) {
                p[Migrations.versionProperty] = Migrations.targetVersion;
              }
            });

            // Create records smart collection.
            Obj.change(collection, (c) => {
              c.objects.push(Ref.make(Collection.makeManaged({ key: Type.getTypename(Type.PersistentType) })));
            });

            // Allow other plugins to add default content.
            yield* Plugin.activate(SpaceEvents.SpaceCreated);
            const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
            yield* Effect.all(
              onCreateSpaceCallbacks.map((onCreateSpace) =>
                onCreateSpace({ space, isDefault: false, rootCollection: collection }),
              ),
            );

            if (observability) {
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* (input) {
            const { space, version: targetVersion } = input;

            if (space.state.get() === SpaceState.SPACE_REQUIRES_MIGRATION) {
              yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
                ...current,
                sdkMigrationRunning: { ...current.sdkMigrationRunning, [space.id]: true },
              }));
              yield* Effect.promise(() => space.internal.migrate());
              yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
                ...current,
                sdkMigrationRunning: { ...current.sdkMigrationRunning, [space.id]: false },
              }));
            }
            const result = yield* Effect.promise(() => Migrations.migrate(space, targetVersion));

            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* (input) {
            yield* Operation.invoke(LayoutOperation.UpdatePopover, {
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
          handler: Effect.fnUntraced(function* (input) {
            const object = input.object as Obj.Unknown;
            yield* Operation.invoke(LayoutOperation.UpdatePopover, {
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
          handler: Effect.fnUntraced(function* (input) {
            yield* Operation.invoke(LayoutOperation.Open, {
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
          handler: Effect.fnUntraced(function* (input) {
            const { Invitation, InvitationEncoder } = yield* Effect.promise(
              () => import('@dxos/react-client/invitations'),
            );

            const invitation = yield* Operation.invoke(SpaceOperation.Share, {
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
          handler: Effect.fnUntraced(function* (input) {
            const db = input.db as Database.Database;
            const client = yield* Capability.get(ClientCapabilities.Client);
            const schema: any = yield* Effect.promise(() =>
              (client as any).graph.schemaRegistry.query({ typename: input.typename, location: ['runtime'] }).first(),
            );
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found');

            Obj.change(space.properties, (p) => {
              if (!p.staticRecords) {
                p.staticRecords = [];
              }
              if (!p.staticRecords.includes(input.typename)) {
                p.staticRecords.push(input.typename);
              }
            });

            yield* Plugin.activate(SpaceEvents.SchemaAdded);
            const onSchemaAdded = yield* Capability.getAll(SpaceCapabilities.OnSchemaAdded);
            yield* Effect.all(
              onSchemaAdded.map((callback) => callback({ db, schema, show: input.show })),
              { concurrency: 'unbounded' },
            );

            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
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
          handler: Effect.fnUntraced(function* (input) {
            const db = input.db;
            const schemas = yield* Effect.promise(() => db.schemaRegistry.register([input.schema]));
            const schema = schemas[0];
            Obj.change(schema.persistentSchema, (s) => {
              if (input.name) {
                s.name = input.name;
              }
              if (input.typename) {
                s.typename = input.typename;
              }
              if (input.version) {
                s.version = input.version;
              }
            });

            yield* Plugin.activate(SpaceEvents.SchemaAdded);
            const onSchemaAdded = yield* Capability.getAll(SpaceCapabilities.OnSchemaAdded);
            yield* Effect.all(
              onSchemaAdded.map((callback) => callback({ db, schema, show: input.show })),
              { concurrency: 'unbounded' },
            );

            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
              name: 'space.schema.add',
              properties: {
                spaceId: db.spaceId,
                objectId: schema.id,
                typename: schema.typename,
              },
            });

            return { id: schema.id, object: schema.persistentSchema, schema };
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
          handler: Effect.fnUntraced(function* (input) {
            const object = input.object as Obj.Unknown;
            const db = Obj.getDatabase(object);
            invariant(db, 'Database not found.');
            const newObject = yield* Effect.promise(() => cloneObject(object, resolve, db));
            yield* Operation.invoke(SpaceOperation.AddObject, { object: newObject, target: db });
          }),
        }),

        //
        // RestoreField (inverse of DeleteField)
        //
        OperationResolver.make({
          operation: SpaceOperation.RestoreField,
          handler: Effect.fnUntraced(function* (input) {
            const registry = yield* Capability.get(Capabilities.AtomRegistry);
            const view = input.view as any;
            const db = Obj.getDatabase(view);
            invariant(db);
            const typename = getTypenameFromQuery(view.query.ast);
            invariant(typename);
            const schema = yield* Effect.promise(() => db.schemaRegistry.query({ typename }).firstOrUndefined());
            invariant(schema);

            // Create projection with change callbacks that wrap in Obj.change().
            const projection = new ProjectionModel({
              registry,
              view,
              baseSchema: schema.jsonSchema,
              change: createEchoChangeCallback(view, schema),
            });

            projection.setFieldProjection({ field: input.field, props: input.props }, input.index);
          }),
        }),

        //
        // RestoreObjects (inverse of RemoveObjects)
        //
        OperationResolver.make({
          operation: SpaceOperation.RestoreObjects,
          handler: Effect.fnUntraced(function* (input) {
            const objects = input.objects as Obj.Unknown[];
            const parentCollection = input.parentCollection as Collection.Collection;
            const indices = input.indices as number[];
            const nestedObjectsList = input.nestedObjectsList as Obj.Unknown[][];
            const wasActive = input.wasActive as string[];

            // Get the space from the first object.
            const space = getSpace(objects[0]);
            invariant(space);

            // Restore objects to the space.
            const restoredObjects = objects.map((obj: Obj.Unknown) => space.db.add(obj));

            // Restore nested objects to the space.
            nestedObjectsList.flat().forEach((obj: Obj.Unknown) => {
              if (Obj.isObject(obj)) {
                space.db.add(obj);
              } else if (Relation.isRelation(obj)) {
                space.db.add(obj);
              }
            });

            // Restore objects to the parent collection at their original indices.
            Obj.change(parentCollection, (c) => {
              indices.forEach((index: number, i: number) => {
                if (index !== -1) {
                  c.objects.splice(index, 0, Ref.make(restoredObjects[i] as Obj.Unknown));
                }
              });
            });

            // Re-open objects that were active.
            if (wasActive.length > 0) {
              yield* Operation.invoke(LayoutOperation.Open, { subject: wasActive });
            }
          }),
        }),
      ]),
    ];
  }),
);
