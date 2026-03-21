//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { type MaybePromise, byPosition } from '@dxos/util';

import { Import } from './definitions';

export default Import.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ rootDir: rootDirInput }) {
      const rootDir =
        rootDirInput ?? (yield* Effect.promise(async () => (window as any).showDirectoryPicker({ mode: 'read' })));
      if (!rootDir) {
        return;
      }

      const serializers = yield* Capability.getAll(AppCapabilities.AppGraphSerializer);

      const importFile = async ({ handle, ancestors }: { handle: FileSystemHandle; ancestors: unknown[] }) => {
        const [name, ...extension] = handle.name.split('.');

        let type = getFileType(extension.join('.'));
        if (!type && handle.kind === 'directory') {
          const metadataHandle = await (handle as any).getFileHandle('.composer.json');
          if (metadataHandle) {
            const file = await metadataHandle.getFile();
            const metadata = JSON.parse(await file.text());
            type = metadata.type;
          }
        } else if (!type) {
          log('unsupported file type', { name, extension });
          return;
        }
        const data = handle.kind === 'directory' ? name : await (await (handle as any).getFile()).text();
        const [serializer] = serializers
          .flat()
          .filter((serializer) =>
            handle.kind === 'directory' ? type === serializer.inputType : type === serializer.outputType,
          )
          .sort(byPosition);

        return serializer?.deserialize({ name, data, type }, ancestors);
      };

      yield* Effect.promise(async () =>
        traverseFileSystem(rootDir, (handle, ancestors) => importFile({ handle, ancestors })),
      );
    }),
  ),
);

const getFileType = (extension: string) => {
  switch (extension) {
    case 'tldraw.json':
      return 'application/tldraw';
    case 'md':
      return 'text/markdown';
    default:
      return undefined;
  }
};

const traverseFileSystem = async (
  handle: FileSystemHandle,
  visitor: (handle: FileSystemHandle, path: string[]) => MaybePromise<any>,
  ancestors: any[] = [],
) => {
  for await (const entry of (handle as any).values()) {
    const result = await visitor(entry, ancestors);
    if (entry.kind === 'directory') {
      await traverseFileSystem(entry, visitor, [...ancestors, result]);
    }
  }
};
