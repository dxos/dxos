//
// Copyright 2023 DXOS.org
//

const notAvailable = () => {
  throw new Error('Not available on this platform');
};

export const access = () => notAvailable();
export const copyFile = () => notAvailable();
export const open = () => notAvailable();
export const rename = () => notAvailable();
export const truncate = () => notAvailable();
export const rmdir = () => notAvailable();
export const rm = () => notAvailable();
export const mkdir = () => notAvailable();
export const readdir = () => notAvailable();
export const readlink = () => notAvailable();
export const symlink = () => notAvailable();
export const lstat = () => notAvailable();
export const stat = () => notAvailable();
export const link = () => notAvailable();
export const unlink = () => notAvailable();
export const chmod = () => notAvailable();
export const lchmod = () => notAvailable();
export const lchown = () => notAvailable();
export const lutimes = () => notAvailable();
export const chown = () => notAvailable();
export const utimes = () => notAvailable();
export const to = () => notAvailable();
export const realpath = () => notAvailable();
export const mkdtemp = () => notAvailable();
export const writeFile = () => notAvailable();
export const appendFile = () => notAvailable();
export const readFile = () => notAvailable();
export const opendir = () => notAvailable();
export const watch = () => notAvailable();
export const cp = () => notAvailable();