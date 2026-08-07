//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, FormBuilder, formatBytes, print, withTimeout } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { type SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

export type ImportArgs = {
  file: string;
  tags: ReadonlyArray<string>;
};

/** Reads an archive of either format from disk and creates a new space from it. */
export const handler = Effect.fn(function* ({ file, tags }: ImportArgs) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const contents = yield* fs.readFile(file);
  // Format is left unset so the host detects it from the extension, falling back to sniffing contents.
  const archive: SpaceArchive = { filename: path.basename(file), contents };
  const space = yield* Effect.tryPromise(() =>
    client.spaces.import(archive, tags.length > 0 ? { tags: [...tags] } : undefined),
  );

  if (json) {
    yield* Console.log(
      JSON.stringify(
        { spaceId: space.id, name: space.properties.name, tags: space.tags, size: contents.length },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'Imported Space' }).pipe(
      FormBuilder.set('spaceId', space.id),
      FormBuilder.set('name', space.properties.name ?? '<none>'),
      FormBuilder.set('tags', space.tags.length > 0 ? space.tags.join(', ') : '<none>'),
      FormBuilder.set('size', formatBytes(contents.length)),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const importSpace = Command.make(
  'import',
  {
    file: Args.file({ name: 'file' }).pipe(Args.withDescription('Archive to import, in either binary or json format.')),
    tags: Options.text('tag').pipe(
      Options.withDescription('Immutable tag to set on the new space. Repeat to set several.'),
      Options.repeated,
    ),
  },
  (args) => handler(args).pipe(withTimeout),
).pipe(Command.withDescription('Import a space archive as a new space.'));
