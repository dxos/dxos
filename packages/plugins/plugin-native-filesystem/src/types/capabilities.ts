//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Text } from '@dxos/schema';

import { meta } from '../meta';

import type { FilesystemFile, NativeFilesystemState, FilesystemWorkspace } from './schema';

/** Service for managing in-memory Text.Text instances backed by native filesystem files. */
export type NativeMarkdownDocumentsService = {
  /** Get or create an in-memory Text.Text for a filesystem file. */
  getOrCreate: (file: FilesystemFile) => Text.Text;
  /** Lookup text object by filesystem file id. */
  getByFileId: (fileId: string) => Text.Text | undefined;
  /** Forward index: resolve disk write target from Echo DXN string. */
  getWriteTargetByDxn: (dxn: string) => { path: string; fileId: string } | undefined;
  /** Reverse index: resolve DXN string from filesystem file id. */
  getDxnForFileId: (fileId: string) => string | undefined;
  /** Evict all cached documents for a workspace's markdown files. */
  evictForWorkspace: (workspace: FilesystemWorkspace) => void;
};

export namespace NativeFilesystemCapabilities {
  export const State = Capability.make<Atom.Writable<NativeFilesystemState>>(`${meta.id}.state`);
  export const NativeMarkdownDocuments = Capability.make<NativeMarkdownDocumentsService>(
    `${meta.id}.native-markdown-documents`,
  );
}
