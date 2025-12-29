//
// Copyright 2025 DXOS.org
//

import { Capability, Common, SettingsAction, createIntent, createResolver } from '@dxos/app-framework';
import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { Node } from '@dxos/plugin-graph';
import { type MaybePromise, byPosition } from '@dxos/util';

import { meta } from '../../meta';
import { LocalFilesAction } from '../../types';
import {
  findFile,
  getDirectoryChildren,
  handleSave,
  handleToLocalDirectory,
  handleToLocalFile,
  legacyFileToLocalFile,
} from '../../util';
import { FileCapabilities } from '../../types';

export default Capability.makeModule((context) => {
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
        // Write original node type to metadata file so the correct serializer can be used during import.
        // For directories, the type cannot be inferred from the file extension.
        const metadata = {
          type: node.type,
        };
        await writeFile(metadataHandle, JSON.stringify(metadata, null, 2));
      } else {
        const handle = await parentHandle.getFileHandle(name, { create: true });
        await writeFile(handle, serialized.data);
      }
    } catch (err) {
      log.catch(err);
    }
  };

  return Capability.contributes(Common.Capability.IntentResolver, [
    createResolver({
      intent: LocalFilesAction.SelectRoot,
      resolve: async () => {
        const state = context.getCapability(FileCapabilities.MutableState);
        const rootDir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        if (rootDir) {
          state.rootHandle = rootDir;
        }
      },
    }),
    createResolver({
      intent: LocalFilesAction.Export,
      resolve: async () => {
        const { explore } = context.getCapability(Common.Capability.AppGraph);
        const state = context.getCapability(FileCapabilities.MutableState);
        if (!state.rootHandle) {
          return { intents: [createIntent(SettingsAction.Open, { plugin: meta.id })] };
        }

        const serializers = context.getCapabilities(Common.Capability.AppGraphSerializer).flat();

        // TODO(wittjosiah): Export needs to include order of nodes as well.
        //   Without this order is not guaranteed to be preserved on import.
        //   This can be done by computing the relations of a node before visiting it.
        //   The inverse needs to be done on import as well,
        //   the files need to be deserialized first in order to restore the relations.
        await explore({
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
        });

        state.lastExport = Date.now();
      },
    }),
    createResolver({
      intent: LocalFilesAction.Import,
      resolve: async (data) => {
        const rootDir = data.rootDir ?? (await (window as any).showDirectoryPicker({ mode: 'read' }));
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
              // For directories, the output type cannot be inferred from the file extension.
              handle.kind === 'directory' ? type === serializer.inputType : type === serializer.outputType,
            )
            .sort(byPosition);

          return serializer?.deserialize({ name, data, type }, ancestors);
        };

        await traverseFileSystem(rootDir, (handle, ancestors) => importFile({ handle, ancestors }));
      },
    }),
    createResolver({
      intent: LocalFilesAction.OpenFile,
      resolve: async () => {
        const state = context.getCapability(FileCapabilities.MutableState);

        if ('showOpenFilePicker' in window) {
          const [handle]: FileSystemFileHandle[] = await (window as any).showOpenFilePicker({
            mode: 'readwrite',
            types: [
              {
                description: 'Markdown',
                accept: { 'text/markdown': ['.md'] },
              },
            ],
          });
          const file = await handleToLocalFile(handle);
          state.files.push(file);

          return { data: { id: file.id, subject: [file.id] } };
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
        const id = await result.wait();
        return { data: { id, subject: [id] } };
      },
    }),
    createResolver({
      intent: LocalFilesAction.OpenDirectory,
      resolve: async () => {
        const state = context.getCapability(FileCapabilities.MutableState);
        const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        const directory = await handleToLocalDirectory(handle);
        state.files.push(directory);
        return { data: { id: directory.id, subject: [directory.id] } };
      },
    }),
    createResolver({
      intent: LocalFilesAction.Reconnect,
      resolve: async (data) => {
        const state = context.getCapability(FileCapabilities.MutableState);
        const entity = state.files.find((entity) => entity.id === data.id);
        if (!entity) {
          return;
        }

        if ('children' in entity) {
          const permission = await (entity.handle as any).requestPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            entity.children = await getDirectoryChildren(entity.handle, entity.handle.name);
            entity.permission = permission;
          }
        } else {
          const permission = await (entity.handle as any)?.requestPermission({ mode: 'readwrite' });
          if (permission === 'granted') {
            const text = await (entity.handle as any).getFile?.().then((file: any) => file.text());
            entity.text = text;
            entity.permission = permission;
          }
        }
      },
    }),
    createResolver({
      intent: LocalFilesAction.Save,
      resolve: async (data) => {
        const state = context.getCapability(FileCapabilities.MutableState);
        const file = findFile(state.files, [data.id]);
        if (file) {
          await handleSave(file);
        }
      },
    }),
    createResolver({
      intent: LocalFilesAction.Close,
      resolve: async (data) => {
        const state = context.getCapability(FileCapabilities.MutableState);
        const index = state.files.findIndex((f) => f.id === data.id);
        if (index >= 0) {
          state.files.splice(index, 1);
        }
      },
    }),
  ]);
});

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
