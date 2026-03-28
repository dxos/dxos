//
// Copyright 2025 DXOS.org
//

import { writeFileSync } from 'node:fs';

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';

import { adminDownload, adminRequest, formatAdminError } from '../util';

type ExportResult = {
  spaceId: string;
  downloadPath: string;
  downloadUrl: string;
  expiresAt: string;
  objectCount: number;
  sizeBytes: number;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const exportSpace = Command.make(
  'export',
  {
    spaceId: Args.text({ name: 'spaceId' }),
    download: Options.boolean('download').pipe(
      Options.withDescription('Download the export after triggering it.'),
      Options.withDefault(false),
    ),
    output: Options.text('output').pipe(
      Options.withDescription('Output file path for download.'),
      Options.withAlias('o'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ spaceId, download, output }) {
    const data = yield* adminRequest('POST', `/admin/spaces/${spaceId}/export`).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
    );

    const result = data as ExportResult;

    if (download) {
      const outputPath = output._tag === 'Some' ? output.value : `export-${spaceId}.json`;

      const response = yield* adminDownload(result.downloadPath).pipe(
        Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
      );

      const body = yield* response.text;
      writeFileSync(outputPath, body, 'utf-8');

      if (yield* CommandConfig.isJson) {
        yield* Console.log(JSON.stringify({ ...result, savedTo: outputPath }, null, 2));
      } else {
        yield* Console.log(
          `Export saved to ${outputPath} (${formatBytes(result.sizeBytes)}, ${result.objectCount} objects).`,
        );
      }
    } else {
      if (yield* CommandConfig.isJson) {
        yield* Console.log(JSON.stringify(result, null, 2));
      } else {
        yield* Console.log(`Export triggered for space ${result.spaceId}.`);
        yield* Console.log(`  Objects: ${result.objectCount}`);
        yield* Console.log(`  Size:    ${formatBytes(result.sizeBytes)}`);
        yield* Console.log(`  Expires: ${result.expiresAt}`);
        yield* Console.log(`  Download: ${result.downloadUrl}`);
        yield* Console.log(`\nUse --download to save the file locally.`);
      }
    }
  }),
).pipe(Command.withDescription('Export space snapshots.'));
