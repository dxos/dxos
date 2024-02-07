//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '../PluginHost';

export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

export type FileInfo = {
  cid: string; // TODO(burdon): Meta.
};

export type FileUploader = (file: File) => Promise<FileInfo | undefined>;

export type FileManagerProvides = {
  file: {
    upload?: FileUploader;
  };
};

// TODO(burdon): Better match against interface? and Return provided service type.
export const parseFileManagerPlugin = (plugin: Plugin) => {
  return (plugin.provides as any).file ? (plugin as Plugin<FileManagerProvides>) : undefined;
};
