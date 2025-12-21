//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as FileSystem from '@effect/platform/FileSystem';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ProfileArchiveEntryType } from '@dxos/protocols';
import { arrayToBuffer } from '@dxos/util';

import { CommandConfig } from '../../services';
import { FormBuilder, print } from '../../util';

export const handler = Effect.fn(function* ({ file, storage }: { file: string; storage: boolean }) {
  const { json } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;

  const { decodeProfileArchive } = yield* Effect.promise(() => import('@dxos/client-services'));

  const data = yield* fs.readFile(file);

  const archive = decodeProfileArchive(data);

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          meta: archive.meta,
          ...(storage ? { storage: archive.storage } : {}),
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'Profile Archive' }).pipe(
      FormBuilder.when(
        archive.meta,
        FormBuilder.each(Object.entries(archive.meta ?? {}), ([key, value]) => FormBuilder.set(key, String(value))),
      ),
      FormBuilder.build,
    );
    yield* Console.log(print(builder));

    if (storage) {
      yield* Console.log('\nStorage entries:\n');
      for (const entry of archive.storage) {
        const key =
          typeof entry.key === 'string' ? entry.key : JSON.stringify(arrayToBuffer(entry.key).toString()).slice(1, -1);
        yield* Console.log(`  ${ProfileArchiveEntryType[entry.type]} ${key}`);
      }
    }
  }
});

export const inspect = Command.make(
  'inspect',
  {
    file: Options.text('file').pipe(Options.withDescription('Archive filename.'), Options.withAlias('f')),
    storage: Options.boolean('storage', { ifPresent: true }).pipe(Options.withDescription('List storage entries.')),
  },
  handler,
).pipe(Command.withDescription('Inspect profile archive.'));
