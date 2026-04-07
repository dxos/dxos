//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { debounce } from '@dxos/async';
import { log } from '@dxos/log';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { listener } from '@dxos/ui-editor';

import { NativeFilesystemCapabilities, type FilesystemWorkspace, type NativeFilesystemState } from '#types';
import { findFileById, updateFileInWorkspace, writeFileContent } from '../util';

const AUTO_SAVE_DELAY_MS = 1000;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const filesystemManager = yield* Capability.get(NativeFilesystemCapabilities.FilesystemManager);

    const pendingSaves = new Map<string, ReturnType<typeof debounce>>();

    const saveFile = (fileId: string, path: string, text: string): Effect.Effect<void> =>
      writeFileContent(path, text).pipe(
        Effect.tap((success) =>
          Effect.sync(() => {
            if (!success) {
              return;
            }

            const registry = capabilities.get(Capabilities.AtomRegistry);
            const stateAtom = capabilities.get(NativeFilesystemCapabilities.State);
            registry.update(stateAtom, (current: NativeFilesystemState) => {
              const result = findFileById(current.workspaces, fileId);
              if (!result) {
                return current;
              }
              if (result.file.text !== text) {
                return current;
              }
              return {
                ...current,
                workspaces: current.workspaces.map((ws: FilesystemWorkspace) =>
                  ws.id === result.workspace.id ? updateFileInWorkspace(ws, fileId, { modified: false }) : ws,
                ),
              };
            });
            log('File auto-saved', { path });
          }),
        ),
        Effect.asVoid,
      );

    /** Get or create a debounced save. The path is resolved at save time via dxn lookup so renames are reflected. */
    const getDebouncedSave = (fileId: string, dxn: string) => {
      let debouncedFn = pendingSaves.get(fileId);
      if (!debouncedFn) {
        debouncedFn = debounce((text: string) => {
          const currentTarget = filesystemManager.getWriteTargetByDxn(dxn);
          if (currentTarget) {
            void Effect.runFork(saveFile(fileId, currentTarget.path, text));
          }
        }, AUTO_SAVE_DELAY_MS);
        pendingSaves.set(fileId, debouncedFn);
      }
      return debouncedFn;
    };

    const extensionProvider = () =>
      listener({
        onChange: ({ id, text }) => {
          const target = filesystemManager.getWriteTargetByDxn(id);
          if (!target) {
            return;
          }

          const { fileId, path } = target;

          const registry = capabilities.get(Capabilities.AtomRegistry);
          const stateAtom = capabilities.get(NativeFilesystemCapabilities.State);
          const state: NativeFilesystemState = registry.get(stateAtom);

          const result = findFileById(state.workspaces, fileId);
          if (!result) {
            return;
          }

          const { workspace, file } = result;
          const textContent = text.toString();
          if (textContent === (file.text ?? '')) {
            return;
          }

          registry.update(stateAtom, (current: NativeFilesystemState) => ({
            ...current,
            workspaces: current.workspaces.map((ws: FilesystemWorkspace) =>
              ws.id === workspace.id ? updateFileInWorkspace(ws, fileId, { text: textContent, modified: true }) : ws,
            ),
          }));

          const debouncedSave = getDebouncedSave(fileId, id);
          void debouncedSave(textContent);
        },
      });

    return Capability.contributes(MarkdownCapabilities.Extensions, [extensionProvider]);
  }),
);
