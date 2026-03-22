//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, type SerializedNode, SettingsOperation } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { type Node } from '@dxos/plugin-graph';
import { byPosition } from '@dxos/util';

import { Export } from './definitions';

import { meta } from '../meta';
import { FileCapabilities, type FilesState } from '../types';

const handler: Operation.WithHandler<typeof Export> = Export.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const { explore } = yield* Capability.get(AppCapabilities.AppGraph);
      const state = yield* Capabilities.getAtomValue(FileCapabilities.State);
      if (!state.rootHandle) {
        yield* Operation.invoke(SettingsOperation.Open, { plugin: meta.id });
        return;
      }

      const serializers = yield* Capability.getAll(AppCapabilities.AppGraphSerializer);

      yield* Effect.promise(async () =>
        explore({
          relation: 'child',
          visitor: async (node, path) => {
            const [serializer] = serializers
              .flat()
              .filter((serializer) => node.type === serializer.inputType)
              .sort(byPosition);
            if (!serializer && node.data !== null) {
              return false;
            }

            const serialized = await serializer.serialize(node);
            await handleExportFile({ node, path: path.slice(1), serialized, state });
          },
        }),
      );

      yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
        ...current,
        lastExport: Date.now(),
      }));
    }),
  ),
);

export default handler;

const directoryHandles: Record<string, FileSystemDirectoryHandle> = {};
const directoryNameCounter: Record<string, Record<string, number>> = {};

const writeFile = async (handle: FileSystemFileHandle, content: string) => {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
};

const getFileName = (node: SerializedNode, counter = 0) => {
  let extension = '';
  switch (node.type) {
    case 'application/tldraw':
      extension = '.tldraw.json';
      break;
    case 'text/markdown':
      extension = '.md';
      break;
    case 'text/directory':
    default:
      break;
  }

  const name = counter > 0 ? `${node.name} (${counter})` : node.name;
  return `${name}${extension}`;
};

const handleExportFile = async ({
  node,
  path,
  serialized,
  state,
}: {
  node: Node.Node;
  path: string[];
  serialized: SerializedNode;
  state: FilesState;
}) => {
  if (!state.rootHandle) {
    return;
  }

  if (node.id === 'root') {
    Object.keys(directoryHandles).forEach((key) => delete directoryHandles[key]);
    Object.keys(directoryNameCounter).forEach((key) => delete directoryNameCounter[key]);
    directoryHandles[''] = state.rootHandle!;
    directoryNameCounter[''] = {};
    for await (const name of (state.rootHandle as any).keys()) {
      await state.rootHandle!.removeEntry(name, { recursive: true });
    }
    return;
  }

  const parentPath = path.slice(0, -1).join('/');
  const parentHandle = directoryHandles[parentPath];
  if (!parentHandle || !(parentHandle instanceof FileSystemDirectoryHandle)) {
    log.warn('missing parent handle', { id: node.id, parentHandle: !!parentHandle });
    return;
  }

  try {
    const nameCounter = directoryNameCounter[parentPath] ?? (directoryNameCounter[parentPath] = {});
    const count = nameCounter[serialized.name] ?? 0;
    const name = getFileName(serialized, count);
    nameCounter[serialized.name] = count + 1;

    if (node.properties.role === 'branch') {
      const handle = await parentHandle.getDirectoryHandle(name, { create: true });
      const pathString = path.join('/');
      directoryHandles[pathString] = handle;

      const metadataHandle = await handle.getFileHandle('.composer.json', { create: true });
      const metadata = { type: node.type };
      await writeFile(metadataHandle, JSON.stringify(metadata, null, 2));
    } else {
      const handle = await parentHandle.getFileHandle(name, { create: true });
      await writeFile(handle, serialized.data);
    }
  } catch (err) {
    log.catch(err);
  }
};
