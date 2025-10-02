//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { meta } from './meta';

export namespace LocalFilesAction {
  const FILES_ACTION = `${meta.id}/action`;

  export class SelectRoot extends Schema.TaggedClass<SelectRoot>()(`${FILES_ACTION}/select-root`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class Export extends Schema.TaggedClass<Export>()(`${FILES_ACTION}/export`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}

  export class Import extends Schema.TaggedClass<Import>()(`${FILES_ACTION}/import`, {
    input: Schema.Struct({
      rootDir: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class OpenFile extends Schema.TaggedClass<OpenFile>()(`${FILES_ACTION}/open-file`, {
    input: Schema.Void,
    output: Schema.Struct({
      id: Schema.String,
      subject: Schema.Array(Schema.String),
    }),
  }) {}

  export class OpenDirectory extends Schema.TaggedClass<OpenDirectory>()(`${FILES_ACTION}/open-directory`, {
    input: Schema.Void,
    output: Schema.Struct({
      id: Schema.String,
      subject: Schema.Array(Schema.String),
    }),
  }) {}

  export class Reconnect extends Schema.TaggedClass<Reconnect>()(`${FILES_ACTION}/reconnect`, {
    input: Schema.Struct({
      id: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class Close extends Schema.TaggedClass<Close>()(`${FILES_ACTION}/close`, {
    input: Schema.Struct({
      id: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class Save extends Schema.TaggedClass<Save>()(`${FILES_ACTION}/save`, {
    input: Schema.Struct({
      id: Schema.String,
    }),
    output: Schema.Void,
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
