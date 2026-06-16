//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { EXEMPLAR_SPACE_TAG } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { MigrationVersionAnnotation, Migrations } from '@dxos/migrations';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import EXEMPLAR_SPACE_JSON from '../content/exemplar-space.dx.json?raw';
import { ImportExemplarSpace } from './definitions';

const EXEMPLAR_SPACE_ARCHIVE_FILENAME = 'exemplar-space.dx.json';

/**
 * Imports the bundled exemplar space idempotently and stamps it as already migrated.
 * If a space tagged EXEMPLAR_SPACE_TAG already exists, it is returned without re-importing.
 */
const handler: Operation.WithHandler<typeof ImportExemplarSpace> = ImportExemplarSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const existing = client.spaces.get().find((space) => space.tags.includes(EXEMPLAR_SPACE_TAG));
      const space =
        existing ??
        (yield* Effect.tryPromise(() => {
          const archive: SpaceArchive = {
            filename: EXEMPLAR_SPACE_ARCHIVE_FILENAME,
            contents: new TextEncoder().encode(EXEMPLAR_SPACE_JSON),
            format: SpaceArchive.Format.JSON,
          };
          return client.spaces.import(archive, { tags: [EXEMPLAR_SPACE_TAG] });
        }));

      yield* Effect.tryPromise(() => space.waitUntilReady());

      if (Migrations.targetVersion) {
        Obj.update(space.properties, (properties) => {
          Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion!);
        });
      }

      log.info('exemplar space ready', { id: space.id, created: !existing });
    }),
  ),
);

export default handler;
