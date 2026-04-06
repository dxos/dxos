//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Text } from '@dxos/schema';

import type { FilesystemManager } from '#capabilities';

import type { FilesystemEntry, FilesystemWorkspace, NativeFilesystemState } from '../types';

/** In-memory mock of FilesystemManager for tests that need graph builder integration. */
export class MockFilesystemManager implements FilesystemManager.FilesystemManager {
  private readonly _documents = new Map<string, Text.Text>();
  private readonly _markdownBindingGeneration = Atom.family((fileId: string) => Atom.make(0).pipe(Atom.keepAlive));

  constructor(state: NativeFilesystemState) {
    for (const workspace of state.workspaces) {
      this._seedMarkdownFiles(workspace.children);
    }
  }

  markdownBindingAtom(fileId: string): Atom.Atom<number> {
    return this._markdownBindingGeneration(fileId);
  }

  getByFileId(fileId: string): Text.Text | undefined {
    return this._documents.get(fileId);
  }

  getWriteTargetByDxn(_dxn: string): { path: string; fileId: string } | undefined {
    return undefined;
  }

  activateWorkspace(_workspace: FilesystemWorkspace): Effect.Effect<void> {
    return Effect.void;
  }

  deactivateWorkspace(_workspace: FilesystemWorkspace): Effect.Effect<void> {
    return Effect.void;
  }

  refreshWorkspaceContent(_workspace: FilesystemWorkspace): Effect.Effect<void> {
    return Effect.void;
  }

  persistState(): Effect.Effect<void> {
    return Effect.void;
  }

  private _seedMarkdownFiles(entries: FilesystemEntry[]): void {
    for (const entry of entries) {
      if ('children' in entry) {
        this._seedMarkdownFiles(entry.children);
      } else if (entry.type === 'markdown') {
        this._documents.set(entry.id, Text.make(entry.text ?? ''));
      }
    }
  }
}
