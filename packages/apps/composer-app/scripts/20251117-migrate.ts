//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as NodeContext from '@effect/platform-node/NodeContext';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import * as Effect from 'effect/Effect';

import { ClientService, ConfigService } from '@dxos/client';
import { ENV_DX_PROFILE_DEFAULT } from '@dxos/client-protocol';
import { Filter, Query, Ref, Type } from '@dxos/echo';
import { EchoDatabase } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { Graph } from '@dxos/plugin-explorer/types';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { Map } from '@dxos/plugin-map/types';
import { Masonry } from '@dxos/plugin-masonry/types';
import { Table } from '@dxos/react-ui-table/types';
import { View } from '@dxos/schema';
import { Database } from '@dxos/echo';

/**
 * Generic migration function for view types.
 * Migrates from schema without view reference to schema with view reference.
 */
const migrateViewType = Effect.fn(function* (
  db: EchoDatabase,
  currentSchema: Type.Entity.Any,
  targetSchema: Type.Entity.Any,
) {
  log.info('migrating', {
    currentSchema: Type.getDXN(currentSchema)?.toString(),
    targetSchema: Type.getDXN(targetSchema)?.toString(),
  });

  const objects = yield* Database.Service.runQuery(
    Query.select(Filter.type(currentSchema)).referencedBy(View.ViewV4, 'presentation'),
  );

  for (const object of objects) {
    const { name, presentation: ref, ...view } = object;
    const presentation = yield* Database.Service.load(ref);
    yield* Effect.promise(() =>
      (db as any)._coreDatabase.atomicReplaceObject(presentation.id, {
        data: {
          ...presentation,
          name,
          view: Ref.make(object),
        },
        type: Type.getDXN(targetSchema),
      }),
    );
    yield* Effect.promise(() =>
      (db as any)._coreDatabase.atomicReplaceObject(view.id, {
        data: { ...view },
        type: Type.getDXN(View.View),
      }),
    );
  }

  log.info('migrated', {
    currentSchema: Type.getDXN(currentSchema)?.toString(),
    targetSchema: Type.getDXN(targetSchema)?.toString(),
  });
});

const command = Command.make(
  'run',
  {
    config: Options.file('config', { exists: 'yes' }).pipe(
      Options.withDescription('Config file path.'),
      Options.withAlias('c'),
      Options.optional,
    ),
    profile: Options.text('profile').pipe(
      Options.withDescription('Profile for the config file.'),
      Options.withDefault(ENV_DX_PROFILE_DEFAULT),
      Options.withAlias('p'),
    ),
    file: Args.fileContent(),
  },
  Effect.fn(function* ({ file: [filename, contents] }: { file: readonly [string, Uint8Array] }) {
    const client = yield* ClientService;
    yield* Effect.promise(async () => {
      await client.halo.createIdentity();
      await client.addTypes([
        Graph.Graph,
        Graph.GraphV1,
        Kanban.Kanban,
        Kanban.KanbanV1,
        Map.Map,
        Map.MapV2,
        Masonry.Masonry,
        Masonry.MasonryV1,
        Table.Table,
        Table.TableV1,
        View.View,
        View.ViewV4,
      ]);
    });

    log.info('importing', { filename, contents: contents.length });
    const space = yield* Effect.promise(() => client.spaces.import({ filename, contents }));
    log.info('imported', { spaceId: space.id, filename });

    yield* Effect.all([
      migrateViewType(space.db, Graph.GraphV1, Graph.Graph),
      migrateViewType(space.db, Kanban.KanbanV1, Kanban.Kanban),
      migrateViewType(space.db, Map.MapV2, Map.Map),
      migrateViewType(space.db, Masonry.MasonryV1, Masonry.Masonry),
      migrateViewType(space.db, Table.TableV1, Table.Table),
    ]).pipe(
      Effect.andThen(() => Database.Service.flush()),
      Effect.provide(Database.Service.layer(space.db)),
    );

    log.info('exporting', { spaceId: space.id });
    const archive = yield* Effect.promise(() => space.internal.export());
    log.info('exported', { spaceId: space.id, filename: archive.filename, contents: archive.contents.length });

    const fs = yield* FileSystem.FileSystem;
    yield* fs.writeFile(archive.filename, archive.contents);
  }),
).pipe(Command.provide(ClientService.layer), Command.provide(ConfigService.layerMemory));

const cli = Command.run(command, {
  name: 'migrate',
  version: '20251117',
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
