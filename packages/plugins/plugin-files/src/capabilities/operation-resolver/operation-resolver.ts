//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver, SettingsOperation } from '@dxos/app-framework';
import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { Node } from '@dxos/plugin-graph';
import { type MaybePromise, byPosition } from '@dxos/util';

import { meta } from '../../meta';
import { FileCapabilities, LocalFilesOperation } from '../../types';
import {
  findFile,
  getDirectoryChildren,
  handleSave,
  handleToLocalDirectory,
  handleToLocalFile,
  legacyFileToLocalFile,
} from '../../util';

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

const writeFile = async (handle: FileSystemFileHandle, content: string) => {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
};

const getFileName = (node: Common.SerializedNode, counter = 0) => {
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

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    const directoryHandles: Record<string, FileSystemDirectoryHandle> = {};
    const directoryNameCounter: Record<string, Record<string, number>> = {};

    const exportFile = async ({
      node,
      path,
      serialized,
    }: {
      node: Node.Node;
      path: string[];
      serialized: Common.SerializedNode;
    }) => {
      const state = context.getCapability(FileCapabilities.MutableState);
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

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: LocalFilesOperation.SelectRoot,
        handler: () =>
          Effect.gen(function* () {
            const state = context.getCapability(FileCapabilities.MutableState);
            const rootDir = yield* Effect.promise(async () =>
              (window as any).showDirectoryPicker({ mode: 'readwrite' }),
            );
            if (rootDir) {
              state.rootHandle = rootDir;
            }
          }),
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.Export,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            const { explore } = context.getCapability(Common.Capability.AppGraph);
            const state = context.getCapability(FileCapabilities.MutableState);
            if (!state.rootHandle) {
              yield* invoke(SettingsOperation.Open, { plugin: meta.id });
              return;
            }

            const serializers = context.getCapabilities(Common.Capability.AppGraphSerializer).flat();

            yield* Effect.promise(async () =>
              explore({
                visitor: async (node, path) => {
                  if (Node.isActionLike(node)) {
                    return false;
                  }

                  const [serializer] = serializers
                    .filter((serializer) => node.type === serializer.inputType)
                    .sort(byPosition);
                  if (!serializer && node.data !== null) {
                    return false;
                  }

                  const serialized = await serializer.serialize(node);
                  await exportFile({ node, path: path.slice(1), serialized });
                },
              }),
            );

            state.lastExport = Date.now();
          }),
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.Import,
        handler: ({ rootDir: rootDirInput }) =>
          Effect.gen(function* () {
            const rootDir =
              rootDirInput ?? (yield* Effect.promise(async () => (window as any).showDirectoryPicker({ mode: 'read' })));
            if (!rootDir) {
              return;
            }

            const serializers = context.getCapabilities(Common.Capability.AppGraphSerializer).flat();

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
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.OpenFile,
        handler: () =>
          Effect.gen(function* () {
            const state = context.getCapability(FileCapabilities.MutableState);

            if ('showOpenFilePicker' in window) {
              const [handle]: FileSystemFileHandle[] = yield* Effect.promise(async () =>
                (window as any).showOpenFilePicker({
                  mode: 'readwrite',
                  types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
                }),
              );
              const file = yield* Effect.promise(async () => handleToLocalFile(handle));
              state.files.push(file);
              return { id: file.id, subject: [file.id] };
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.md,text/markdown';
            const result = new Trigger<string>();
            input.onchange = async () => {
              const [legacyFile] = input.files ? Array.from(input.files) : [];
              if (legacyFile) {
                const file = await legacyFileToLocalFile(legacyFile);
                state.files.push(file);
                result.wake(file.id);
              }
            };
            input.click();
            const id = yield* Effect.promise(async () => result.wait());
            return { id, subject: [id] };
          }),
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.OpenDirectory,
        handler: () =>
          Effect.gen(function* () {
            const state = context.getCapability(FileCapabilities.MutableState);
            const handle = yield* Effect.promise(async () =>
              (window as any).showDirectoryPicker({ mode: 'readwrite' }),
            );
            const directory = yield* Effect.promise(async () => handleToLocalDirectory(handle));
            state.files.push(directory);
            return { id: directory.id, subject: [directory.id] };
          }),
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.Reconnect,
        handler: ({ id }) =>
          Effect.gen(function* () {
            const state = context.getCapability(FileCapabilities.MutableState);
            const entity = state.files.find((entity) => entity.id === id);
            if (!entity) {
              return;
            }

            if ('children' in entity) {
              const permission = yield* Effect.promise(async () =>
                (entity.handle as any).requestPermission({ mode: 'readwrite' }),
              );
              if (permission === 'granted') {
                entity.children = yield* Effect.promise(async () =>
                  getDirectoryChildren(entity.handle, entity.handle.name),
                );
                entity.permission = permission;
              }
            } else {
              const permission = yield* Effect.promise(async () =>
                (entity.handle as any)?.requestPermission({ mode: 'readwrite' }),
              );
              if (permission === 'granted') {
                const text = yield* Effect.promise(async () =>
                  (entity.handle as any).getFile?.().then((file: any) => file.text()),
                );
                entity.text = text;
                entity.permission = permission;
              }
            }
          }),
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.Save,
        handler: ({ id }) =>
          Effect.gen(function* () {
            const state = context.getCapability(FileCapabilities.MutableState);
            const file = findFile(state.files, [id]);
            if (file) {
              yield* Effect.promise(async () => handleSave(file));
            }
          }),
      }),
      OperationResolver.make({
        operation: LocalFilesOperation.Close,
        handler: ({ id }) =>
          Effect.sync(() => {
            const state = context.getCapability(FileCapabilities.MutableState);
            const index = state.files.findIndex((f) => f.id === id);
            if (index >= 0) {
              state.files.splice(index, 1);
            }
          }),
      }),
    ]);
  }),
);

