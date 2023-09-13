//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';

export const FILES_PLUGIN = 'dxos.org/plugin/files';

export const FILES_PLUGIN_SHORT_ID = 'fs';

const FILES_ACTION = `${FILES_PLUGIN}/action`;
export enum LocalFilesAction {
  OPEN_FILE = `${FILES_ACTION}/open-file`,
  OPEN_DIRECTORY = `${FILES_ACTION}/open-directory`,
  RECONNECT = `${FILES_ACTION}/reconnect`,
  CLOSE = `${FILES_ACTION}/close`,
  SAVE = `${FILES_ACTION}/save`,
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

export type LocalFilesPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;
