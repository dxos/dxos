//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { FILES_PLUGIN } from './meta';

export namespace LocalFilesAction {
  const FILES_ACTION = `${FILES_PLUGIN}/action`;

  export class SelectRoot extends S.TaggedClass<SelectRoot>()(`${FILES_ACTION}/select-root`, {
    input: S.Void,
    output: S.Void,
  }) {}

  export class Export extends S.TaggedClass<Export>()(`${FILES_ACTION}/export`, {
    input: S.Void,
    output: S.Void,
  }) {}

  export class Import extends S.TaggedClass<Import>()(`${FILES_ACTION}/import`, {
    input: S.Struct({
      rootDir: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class OpenFile extends S.TaggedClass<OpenFile>()(`${FILES_ACTION}/open-file`, {
    input: S.Void,
    output: S.Struct({
      id: S.String,
      subject: S.Array(S.String),
    }),
  }) {}

  export class OpenDirectory extends S.TaggedClass<OpenDirectory>()(`${FILES_ACTION}/open-directory`, {
    input: S.Void,
    output: S.Struct({
      id: S.String,
      subject: S.Array(S.String),
    }),
  }) {}

  export class Reconnect extends S.TaggedClass<Reconnect>()(`${FILES_ACTION}/reconnect`, {
    input: S.Struct({
      id: S.String,
    }),
    output: S.Void,
  }) {}

  export class Close extends S.TaggedClass<Close>()(`${FILES_ACTION}/close`, {
    input: S.Struct({
      id: S.String,
    }),
    output: S.Void,
  }) {}

  export class Save extends S.TaggedClass<Save>()(`${FILES_ACTION}/save`, {
    input: S.Struct({
      id: S.String,
    }),
    output: S.Void,
  }) {}
}

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

export const FilesSettingsSchema = S.mutable(
  S.Struct({
    autoExport: S.Boolean,
    autoExportInterval: S.Number,
    openLocalFiles: S.optional(S.Boolean),
  }),
);

export type FilesSettingsProps = S.Schema.Type<typeof FilesSettingsSchema>;

export type FilesState = {
  exportRunning: boolean;
  lastExport?: number;
  files: LocalEntity[];
  current: LocalFile | undefined;
  // TODO(wittjosiah): Should be in settings but settings store doesn't support instance types.
  rootHandle?: FileSystemDirectoryHandle;
};
