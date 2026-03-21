//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { log } from '@dxos/log';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/ui-editor';

import {
  NativeFilesystemCapabilities,
  type FilesystemFile,
  type FilesystemWorkspace,
  type NativeFilesystemState,
} from '../../types';
import { findFileById, updateFileInWorkspace, writeFileContent } from '../../util';

const AUTO_SAVE_DELAY_MS = 1000;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const pendingSaves = new Map<string, ReturnType<typeof debounce>>();

    const saveFile = async (fileId: string, text: string) => {
      const registry = capabilities.get(Capabilities.AtomRegistry);
      const stateAtom = capabilities.get(NativeFilesystemCapabilities.State);
      const state: NativeFilesystemState = registry.get(stateAtom);

      const result = findFileById(state.workspaces, fileId);
      if (!result) {
        log.warn('File not found for auto-save', { fileId });
        return;
      }

      const { workspace, file } = result;

      const success = await writeFileContent(file.path, text);
      if (success) {
        registry.update(stateAtom, (current: NativeFilesystemState) => ({
          ...current,
          workspaces: current.workspaces.map((ws: FilesystemWorkspace) =>
            ws.id === workspace.id ? updateFileInWorkspace(ws, fileId, { modified: false }) : ws,
          ),
        }));
        log('File auto-saved', { path: file.path });
      }
    };

    const getDebouncedSave = (fileId: string) => {
      let debouncedFn = pendingSaves.get(fileId);
      if (!debouncedFn) {
        debouncedFn = debounce(async (text: string) => {
          await saveFile(fileId, text);
        }, AUTO_SAVE_DELAY_MS);
        pendingSaves.set(fileId, debouncedFn);
      }
      return debouncedFn;
    };

    const extensionProvider = () =>
      listener({
        onChange: ({ id, text }) => {
          if (!id.startsWith('fs:')) {
            return;
          }

          const registry = capabilities.get(Capabilities.AtomRegistry);
          const stateAtom = capabilities.get(NativeFilesystemCapabilities.State);
          const state: NativeFilesystemState = registry.get(stateAtom);

          const result = findFileById(state.workspaces, id);
          if (!result) {
            return;
          }

          const { workspace, file } = result;
          const textContent = text.toString();

          if (file.text !== textContent) {
            registry.update(stateAtom, (current: NativeFilesystemState) => ({
              ...current,
              workspaces: current.workspaces.map((ws: FilesystemWorkspace) =>
                ws.id === workspace.id ? updateFileInWorkspace(ws, id, { text: textContent, modified: true }) : ws,
              ),
              currentFile:
                current.currentFile?.id === id
                  ? ({ ...current.currentFile, text: textContent, modified: true } as FilesystemFile)
                  : current.currentFile,
            }));

            const debouncedSave = getDebouncedSave(id);
            void debouncedSave(textContent);
          }
        },
      });

    return Capability.contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
  }),
);
