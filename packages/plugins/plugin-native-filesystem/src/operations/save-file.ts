//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { NativeFilesystemCapabilities, NativeFilesystemOperation, type FilesystemWorkspace } from '../types';
import { findFileById, updateFileInWorkspace, writeFileContent } from '../util';

export default NativeFilesystemOperation.SaveFile.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(NativeFilesystemCapabilities.State);
      const nativeMarkdownDocs = yield* Capability.get(NativeFilesystemCapabilities.NativeMarkdownDocuments);

      const state = registry.get(stateAtom);
      const result = findFileById(state.workspaces, id);

      if (!result) {
        log.warn('File not found for save', { id });
        return;
      }

      const { workspace, file } = result;
      const cachedDoc = nativeMarkdownDocs.getByFileId(id);
      const text = cachedDoc ? getDocumentText(cachedDoc) : file.text;

      if (text === undefined) {
        log.warn('File has no content to save', { id });
        return;
      }

      const success = yield* Effect.promise(() => writeFileContent(file.path, text));
      if (success) {
        registry.update(stateAtom, (current) => ({
          ...current,
          workspaces: current.workspaces.map((ws: FilesystemWorkspace) =>
            ws.id === workspace.id ? updateFileInWorkspace(ws, id, { modified: false }) : ws,
          ),
        }));
      }
    }),
  ),
);

/** Read the current content string from a cached in-memory Text.Text. */
const getDocumentText = (doc: { content?: string }): string | undefined => doc.content;
