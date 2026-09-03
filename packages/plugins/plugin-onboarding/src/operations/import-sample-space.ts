//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Migrations, MigrationVersionAnnotation } from '@dxos/migrations';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { SpacesService } from '@dxos/protocols/rpc';

import SAMPLE_SPACE_JSON from '../content/sample/space.dx.json?raw';
import { ImportSampleSpace } from './definitions.ts';

const SAMPLE_SPACE_ARCHIVE_FILENAME = 'sample-space.dx.json';

/**
 * Imports the bundled sample space and stamps it as already migrated.
 * Idempotent by default: reuses the existing tagged space unless `force` is set,
 * in which case a fresh copy is always imported.
 */
const handler: Operation.WithHandler<typeof ImportSampleSpace> = ImportSampleSpace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ force }) {
      const client = yield* Capability.get(ClientCapabilities.Client);

      const existing = force
        ? undefined
        : client.spaces.get().find((space) => space.tags.includes(AppSpace.SAMPLE_SPACE_TAG));
      const space =
        existing ??
        (yield* Effect.tryPromise(() => {
          const archive: SpacesService.SpaceArchive = {
            filename: SAMPLE_SPACE_ARCHIVE_FILENAME,
            contents: new TextEncoder().encode(SAMPLE_SPACE_JSON),
            format: SpacesService.SpaceArchiveFormat.enums.JSON,
          };
          return client.spaces.import(archive, { tags: [AppSpace.SAMPLE_SPACE_TAG] });
        }));

      yield* Effect.tryPromise(() => space.waitUntilReady());

      if (Migrations.targetVersion) {
        Obj.update(space.properties, (properties) => {
          Annotation.set(properties, MigrationVersionAnnotation, Migrations.targetVersion!);
        });
      }

      log.info('sample space ready', { id: space.id, created: !existing });
    }),
  ),
);

export default handler;
