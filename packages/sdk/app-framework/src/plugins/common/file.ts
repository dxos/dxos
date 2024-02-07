//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '../PluginHost';

export type FileInfo = {
  cid: string; // TODO(burdon): Meta.
};

export type FileUploader = (file: FileInfo) => Promise<string | undefined>;

export type FileManagerProvides = {
  file: {
    upload?: FileUploader;
  };
};

// TODO(burdon): Better match against interface? and Return provided service type.
export const parseFileManagerPlugin = (plugin: Plugin) => {
  return (plugin.provides as any).file ? (plugin as Plugin<FileManagerProvides>) : undefined;
};
