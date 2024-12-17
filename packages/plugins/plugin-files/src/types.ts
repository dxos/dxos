//
// Copyright 2023 DXOS.org
//

import {
  ActiveParts,
  type GraphBuilderProvides,
  type GraphSerializerProvides,
  type IntentResolverProvides,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
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
      activeParts: ActiveParts,
    }),
  }) {}

  export class OpenDirectory extends S.TaggedClass<OpenDirectory>()(`${FILES_ACTION}/open-directory`, {
    input: S.Void,
    output: S.Struct({
      id: S.String,
      activeParts: ActiveParts,
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

export type FilesSettingsProps = {
  autoExport: boolean;
  autoExportInterval: number;
  rootHandle?: FileSystemDirectoryHandle;
  openLocalFiles?: boolean;
};

export type FilesState = {
  exportRunning: boolean;
  lastExport?: number;
  files: LocalEntity[];
  current: LocalFile | undefined;
};

export type LocalFilesPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  TranslationsProvides &
  SettingsProvides<FilesSettingsProps>;
