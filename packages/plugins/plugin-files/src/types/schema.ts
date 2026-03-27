//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

type PermissionStatus = 'granted' | 'denied' | 'prompt';

export type LocalEntity = LocalDirectory | LocalFile;

// TODO(burdon): Adapt to use/extend DocumentType.
export type LocalFile = {
  id: string;
  name: string;
  handle: FileSystemFileHandle | false;
  permission: PermissionStatus;
  text?: string;
  // TODO(wittjosiah): Store original text?
  modified?: boolean;
};

export type LocalDirectory = {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  permission: PermissionStatus;
  children: LocalEntity[];
};

export const FilesSettingsSchema = Schema.mutable(
  Schema.Struct({
    autoExport: Schema.Boolean,
    autoExportInterval: Schema.Number,
    openLocalFiles: Schema.optional(Schema.Boolean),
  }),
);

export type FilesSettingsProps = Schema.Schema.Type<typeof FilesSettingsSchema>;

export type FilesState = {
  exportRunning: boolean;
  lastExport?: number;
  files: LocalEntity[];
  current: LocalFile | undefined;
  // TODO(wittjosiah): Should be in settings but settings store doesn't support instance types.
  rootHandle?: FileSystemDirectoryHandle;
};
