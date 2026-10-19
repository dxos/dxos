//
// Copyright 2026 DXOS.org
//

import * as Args from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { CommandConfig, FormBuilder, formatBytes, print, withTimeout } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { SpaceId } from '@dxos/keys';
import { type SpacesService } from '@dxos/protocols/rpc';

import { InvalidSpaceIdError } from '../../../errors.ts';

export type ImportArgs = {
  file: string;
  tags: ReadonlyArray<string>;
  /** Merge a JSON archive into this existing space instead of creating one. */
  into?: Option.Option<string>;
};

/** Reads an archive of either format from disk and creates a new space from it, or merges it into `into`. */
export const handler = Effect.fn(function* ({ file, tags, into = Option.none() }: ImportArgs) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const contents = yield* fs.readFile(file);
  // Format is left unset so the host detects it from the extension, falling back to sniffing contents.
  const archive: SpacesService.SpaceArchive = { filename: path.basename(file), contents };
  const target = Option.getOrUndefined(into);
  if (target !== undefined && !SpaceId.isValid(target)) {
    return yield* Effect.fail(new InvalidSpaceIdError({ context: { spaceId: target } }));
  }
  const space = yield* Effect.tryPromise(() =>
    client.spaces.import(archive, {
      ...(tags.length > 0 ? { tags: [...tags] } : {}),
      ...(target !== undefined ? { into: target } : {}),
    }),
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
    file: Args.File('file').pipe(Args.withDescription('Archive to import, in either binary or json format.')),
    tags: Options.String('tag').pipe(
      Options.withDescription('Immutable tag to set on the new space. Repeat to set several.'),
      Options.atLeast(0),
    ),
    into: Options.String('into').pipe(
      Options.withDescription(
        'Merge a JSON archive (e.g. one exported with --feed) into this existing space; already-present objects and feed messages are skipped.',
      ),
      Options.optional,
    ),
  },
  (args) => handler(args).pipe(withTimeout),
).pipe(Command.withDescription('Import a space archive as a new space.'));
