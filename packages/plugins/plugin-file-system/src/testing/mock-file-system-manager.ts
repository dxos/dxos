//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { Text } from '@dxos/schema';

import type { FileSystemManager } from '#capabilities';
import { FileSystemCapabilities } from '#types';

/** In-memory mock of FileSystemManager for tests that need graph builder integration. */
export class MockFileSystemManager implements FileSystemManager.FileSystemManager {
  private readonly _documents = new Map<string, Text.Text>();
  private readonly _markdownBindingGeneration = Atom.family((fileId: string) => Atom.make(0).pipe(Atom.keepAlive));

  constructor(state: FileSystemCapabilities.FileSystemState) {
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

  getWriteTargetByDXN(_dxn: string): { path: string; fileId: string } | undefined {
    return undefined;
  }

  activateWorkspace(_workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void> {
    return Effect.void;
  }

  deactivateWorkspace(_workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void> {
    return Effect.void;
  }

  refreshWorkspaceContent(_workspace: FileSystemCapabilities.FileSystemWorkspace): Effect.Effect<void> {
    return Effect.void;
  }

  persistState(): Effect.Effect<void> {
    return Effect.void;
  }

  private _seedMarkdownFiles(entries: FileSystemCapabilities.FileSystemEntry[]): void {
    for (const entry of entries) {
      if ('children' in entry) {
        this._seedMarkdownFiles(entry.children);
      } else if (entry.type === 'markdown') {
        this._documents.set(entry.id, Text.make({ content: entry.text ?? '' }));
      }
    }
  }
}
