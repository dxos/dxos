//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  GraphSerializerProvides,
  IntentResolverProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { FILES_PLUGIN } from './meta';

const FILES_ACTION = `${FILES_PLUGIN}/action`;
export enum LocalFilesAction {
  OPEN_FILE = `${FILES_ACTION}/open-file`,
  OPEN_DIRECTORY = `${FILES_ACTION}/open-directory`,
  RECONNECT = `${FILES_ACTION}/reconnect`,
  CLOSE = `${FILES_ACTION}/close`,
  SAVE = `${FILES_ACTION}/save`,
  SELECT_ROOT = `${FILES_ACTION}/select-root`,
  EXPORT = `${FILES_ACTION}/export`,
  IMPORT = `${FILES_ACTION}/import`,
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

export type LocalEntity = LocalDirectory | LocalFile;

export type LocalFile = {
  id: string;
  title: string;
  handle: FileSystemFileHandle | false;
  permission: PermissionStatus;
  text?: string;
  // TODO(wittjosiah): Store original text?
  modified?: boolean;
};

export type LocalDirectory = {
  id: string;
  title: string;
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
  files: LocalEntity[];
  current: LocalFile | undefined;
};

export type LocalFilesPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  TranslationsProvides &
  SettingsProvides<FilesSettingsProps>;
