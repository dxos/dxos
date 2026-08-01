//
// Copyright 2026 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import {
  CommandConfig,
  Common,
  FormBuilder,
  formatBytes,
  getSpace,
  print,
  spaceIdWithDefault,
  withTimeout,
} from '@dxos/cli-util';
import { type Key } from '@dxos/echo';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import { SpaceNotReadyError } from '../../../errors';

const SPACE_READY_TIMEOUT = Duration.seconds(30);

// TODO(wittjosiah): Upstream as SpaceArchive.Formats/SpaceArchive.Format, replacing the proto enum.
export const Formats = ['binary', 'json'] as const;

export type Format = (typeof Formats)[number];

export type ExportArgs = {
  spaceId: Option.Option<Key.SpaceId>;
  output: Option.Option<string>;
  format: Format;
};

/** Exports a space in the given archive format and writes it to disk. */
export const handler = Effect.fn(function* ({ spaceId, output, format }: ExportArgs) {
  const { json } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId);
  const space = yield* getSpace(resolvedSpaceId);

  // Export reads the epoch root, and a closed space never becomes ready — so cap the wait.
  yield* Effect.tryPromise(() => space.waitUntilReady()).pipe(
    Effect.timeoutFail({
      duration: SPACE_READY_TIMEOUT,
      onTimeout: () => new SpaceNotReadyError({ context: { spaceId: resolvedSpaceId } }),
    }),
  );

  const archive = yield* Effect.tryPromise(() =>
    space.internal.export({
      format: Match.value(format).pipe(
        Match.when('binary', () => SpaceArchive.Format.BINARY),
        Match.when('json', () => SpaceArchive.Format.JSON),
        Match.exhaustive,
      ),
    }),
  );
  const outputPath = yield* resolveOutputPath(output, archive.filename);
  yield* fs.makeDirectory(path.dirname(outputPath), { recursive: true });
  yield* fs.writeFile(outputPath, archive.contents);

  if (json) {
    yield* Console.log(
      JSON.stringify({ spaceId: resolvedSpaceId, format, path: outputPath, size: archive.contents.length }, null, 2),
    );
  } else {
    const builder = FormBuilder.make({ title: 'Exported Space' }).pipe(
      FormBuilder.set('spaceId', resolvedSpaceId),
      FormBuilder.set('format', format),
      FormBuilder.set('path', outputPath),
      FormBuilder.set('size', formatBytes(archive.contents.length)),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const exportSpace = Command.make(
  'export',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    format: Options.choice('format', Formats).pipe(
      Options.withDescription(
        'Archive format: binary is a direct dump of the underlying storage and includes document history; json contains current object state only.',
      ),
      Options.withDefault('binary' as const),
    ),
    output: Options.text('output').pipe(
      Options.withAlias('o'),
      Options.withDescription('Output file, or a directory to write the generated filename into.'),
      Options.optional,
    ),
  },
  (args) => handler(args).pipe(withTimeout),
).pipe(Command.withDescription('Export a space archive to disk.'));

const resolveOutputPath = Effect.fn(function* (output: Option.Option<string>, filename: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  if (Option.isNone(output)) {
    return path.resolve(filename);
  }

  // An existing directory target keeps the generated space-scoped, timestamped filename.
  const info = yield* fs.stat(output.value).pipe(Effect.option);
  const isDirectory = Option.isSome(info) && info.value.type === 'Directory';
  return path.resolve(isDirectory ? path.join(output.value, filename) : output.value);
});
