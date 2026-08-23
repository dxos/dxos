//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import type { FileSystemManager as FileSystemManagerNs } from '#capabilities';
import { meta } from '#meta';

export const State = Capability.makeSingleton<Atom.Writable<FileSystemState>>()(`${meta.profile.key}.state`);
export const FileSystemManager = Capability.makeSingleton<FileSystemManagerNs.FileSystemManager>()(
  `${meta.profile.key}.fileSystemManager`,
);

export type FileSystemFile = {
  id: string;
  name: string;
  path: string;
  text?: string;
  modified?: boolean;
  type: 'markdown' | 'image';
};

export type FileSystemDirectory = {
  id: string;
  name: string;
  path: string;
  children: FileSystemEntry[];
};

export type FileSystemEntry = FileSystemFile | FileSystemDirectory;

export type FileSystemWorkspace = {
  id: string;
  name: string;
  path: string;
  children: FileSystemEntry[];
  icon?: string;
  hue?: string;
  spaceId?: string;
};

export type FileSystemState = {
  workspaces: FileSystemWorkspace[];
  currentFile?: FileSystemFile;
};

/**
 * True when `entry` is a non-null object with a `children` array (directory or workspace shape).
 * Safe for any `node.data` value; graph nodes often use `null` or non-filesystem payloads.
 */
export const isFileSystemDirectory = (entry: unknown): entry is FileSystemDirectory => {
  return typeof entry === 'object' && entry !== null && 'children' in entry;
};

/**
 * True when `entry` is a file node (has `type`, no `children`). Safe for non-objects.
 */
export const isFileSystemFile = (entry: unknown): entry is FileSystemFile => {
  return typeof entry === 'object' && entry !== null && 'type' in entry && !('children' in entry);
};

export const isFileSystemWorkspace = (entry: unknown): entry is FileSystemWorkspace => {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'id' in entry &&
    'path' in entry &&
    'children' in entry &&
    typeof (entry as FileSystemWorkspace).path === 'string'
  );
};
