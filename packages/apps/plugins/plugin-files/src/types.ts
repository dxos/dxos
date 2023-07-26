//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';

export const LOCAL_FILES_PLUGIN = 'dxos:local';

export enum LocalFilesAction {
  OPEN_FILE = `${LOCAL_FILES_PLUGIN}:open-file`,
  OPEN_DIRECTORY = `${LOCAL_FILES_PLUGIN}:open-directory`,
  RECONNECT = `${LOCAL_FILES_PLUGIN}:reconnect`,
  CLOSE = `${LOCAL_FILES_PLUGIN}:close`,
  SAVE = `${LOCAL_FILES_PLUGIN}:save`,
}

type PermissionStatus = 'granted' | 'denied' | 'prompt';

export type LocalEntity = LocalDirectory | LocalFile;

export type LocalFile = {
  id: string;
  title: string;
  handle?: FileSystemFileHandle;
  permission?: PermissionStatus;
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

export type LocalFilesPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;
