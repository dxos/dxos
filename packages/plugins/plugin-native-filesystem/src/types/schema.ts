//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

const FILESYSTEM_OPERATION = `${meta.id}.operation`;

export namespace NativeFilesystemOperation {
  export const OpenDirectory = Operation.make({
    meta: { key: `${FILESYSTEM_OPERATION}.open-directory`, name: 'Open Folder' },
    services: [Capability.Service],
    input: Schema.Void,
    output: Schema.Union(
      Schema.Void,
      Schema.Struct({ id: Schema.String, subject: Schema.Array(Schema.String) }),
    ),
  });

  export const CloseDirectory = Operation.make({
    meta: { key: `${FILESYSTEM_OPERATION}.close-directory`, name: 'Close Folder' },
    services: [Capability.Service],
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Void,
  });

  export const SaveFile = Operation.make({
    meta: { key: `${FILESYSTEM_OPERATION}.save-file`, name: 'Save File' },
    services: [Capability.Service],
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Void,
  });

  export const RefreshDirectory = Operation.make({
    meta: { key: `${FILESYSTEM_OPERATION}.refresh-directory`, name: 'Refresh Folder' },
    services: [Capability.Service],
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Void,
  });
}

export type FilesystemFile = {
  id: string;
  name: string;
  path: string;
  text?: string;
  modified?: boolean;
  type: 'markdown' | 'image';
};

export type FilesystemDirectory = {
  id: string;
  name: string;
  path: string;
  children: FilesystemEntry[];
};

export type FilesystemEntry = FilesystemFile | FilesystemDirectory;

export type FilesystemWorkspace = {
  id: string;
  name: string;
  path: string;
  children: FilesystemEntry[];
};

export type NativeFilesystemState = {
  workspaces: FilesystemWorkspace[];
  currentFile?: FilesystemFile;
};

export const isFilesystemDirectory = (entry: FilesystemEntry): entry is FilesystemDirectory => {
  return 'children' in entry;
};

export const isFilesystemFile = (entry: FilesystemEntry): entry is FilesystemFile => {
  return 'type' in entry && !('children' in entry);
};

export const isFilesystemWorkspace = (entry: unknown): entry is FilesystemWorkspace => {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'id' in entry &&
    'path' in entry &&
    'children' in entry &&
    typeof (entry as FilesystemWorkspace).path === 'string'
  );
};
