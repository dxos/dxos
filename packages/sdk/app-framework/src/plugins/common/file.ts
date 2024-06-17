//
// Copyright 2024 DXOS.org
//

import { type Space } from '@dxos/client-protocol';

import { type Plugin } from '../PluginHost';

// TODO(burdon): See Accept attribute (uses MIME types).
// E.g., 'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
export const defaultFileTypes = {
  images: ['png', 'jpg', 'jpeg', 'gif'],
  media: ['mp3', 'mp4', 'mov', 'avi'],
  text: ['pdf', 'txt', 'md'],
};

export type FileInfo = {
  url?: string;
  cid?: string; // TODO(burdon): Meta key? Or other common properties with other file management system? (e.g., WNFS).
};

export type FileUploader = (file: File, space: Space) => Promise<FileInfo | undefined>;

/**
 * Generic interface provided by file plugins (e.g., IPFS, WNFS).
 */
export type FileManagerProvides = {
  file: {
    upload?: FileUploader;
  };
};

// TODO(burdon): Better match against interface? and Return provided service type. What if multiple?
export const parseFileManagerPlugin = (plugin: Plugin) => {
  return (plugin.provides as any).file ? (plugin as Plugin<FileManagerProvides>) : undefined;
};
