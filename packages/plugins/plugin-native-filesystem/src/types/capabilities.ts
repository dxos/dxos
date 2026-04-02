//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import type * as Effect from 'effect/Effect';
import type * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { type Text } from '@dxos/schema';

import { meta } from '../meta';

import type { FilesystemFile, FilesystemWorkspace, NativeFilesystemState } from './schema';

/** Service for managing recursive directory watchers on filesystem workspaces. */
export type DirectoryWatcherService = {
  /** Start watching a workspace directory for structural changes. */
  startWatching: (workspace: FilesystemWorkspace) => Effect.Effect<void>;
  /** Stop watching a workspace directory. */
  stopWatching: (workspaceId: string) => Effect.Effect<void>;
};

/** Service for managing Text.Text instances backed by native filesystem files. */
export type NativeMarkdownDocumentsService = {
  /**
   * Ensure a Text.Text exists for this file (mirror space), persisting xattr/filemap.
   * Used when opening a file that has no stored DXN yet — not called from graph construction.
   */
  ensureDocumentForFile: (file: FilesystemFile, workspaceId: string) => Text.Text;
  /** Lookup text object by filesystem file id. */
  getByFileId: (fileId: string) => Text.Text | undefined;
  /**
   * Per-file reactive generation; graph connectors should `get(markdownBindingAtom(fileId))` so only
   * that file's node invalidates when its Text binding is indexed or evicted.
   */
  markdownBindingAtom: (fileId: string) => Atom.Atom<number>;
  /** Forward index: resolve disk write target from Echo DXN string. */
  getWriteTargetByDxn: (dxn: string) => { path: string; fileId: string } | undefined;
  /** Reverse index: resolve DXN string from filesystem file id. */
  getDxnForFileId: (fileId: string) => string | undefined;
  /** Pre-load existing objects from xattr/filemap for a workspace on startup. */
  restoreWorkspaceDocuments: (workspace: FilesystemWorkspace, space: Space) => Effect.Effect<void>;
  /**
   * Restore from xattr/filemap then create Text for any markdown file still unmapped.
   * Used after workspace open and directory refresh (not from graph construction).
   */
  syncMarkdownFilesFromDisk: (workspace: FilesystemWorkspace) => Effect.Effect<void>;
  /** Evict all cached documents for a workspace's markdown files. */
  evictForWorkspace: (workspace: FilesystemWorkspace) => void;
};

/** Service for managing mirror spaces that back filesystem workspaces. */
export type MirrorSpaceManagerService = {
  /** Get or create a tagged ECHO space for a filesystem workspace. */
  getOrCreateSpace: (workspace: FilesystemWorkspace) => Effect.Effect<Space>;
  /** Lookup the cached mirror space for a workspace. */
  getSpaceForWorkspace: (workspaceId: string) => Option.Option<Space>;
};

export namespace NativeFilesystemCapabilities {
  export const State = Capability.make<Atom.Writable<NativeFilesystemState>>(`${meta.id}.state`);
  export const NativeMarkdownDocuments = Capability.make<NativeMarkdownDocumentsService>(
    `${meta.id}.native-markdown-documents`,
  );
  export const DirectoryWatcher = Capability.make<DirectoryWatcherService>(`${meta.id}.directory-watcher`);
  export const MirrorSpaceManager = Capability.make<MirrorSpaceManagerService>(`${meta.id}.mirror-space-manager`);
}
