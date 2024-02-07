//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '../PluginHost';

export type FileInfo = {
  file: File;
  cid: string; // TODO(burdon): Meta.
};

export type FileManagerProvides = {
  file: {
    upload?: (file: FileInfo) => Promise<string | undefined>;
  };
};

// TODO(burdon): Better match against interface? and Return provided service type.
export const parseFileManagerResolverPlugin = (plugin: Plugin) => {
  return (plugin.provides as any).file ? (plugin as Plugin<FileManagerProvides>) : undefined;
};
