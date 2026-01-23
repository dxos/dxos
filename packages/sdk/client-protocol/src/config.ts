//
// Copyright 2022 DXOS.org
//

// TODO(wittjosiah): Factor out to @dxos/config.

export const DEFAULT_CLIENT_CHANNEL = 'dxos:app';
export const DEFAULT_INTERNAL_CHANNEL = 'dxos:vault';
export const DEFAULT_SHELL_CHANNEL = 'dxos:shell';
export const DEFAULT_WORKER_BROADCAST_CHANNEL = 'dxos:shared-worker';

/**
 * @deprecated
 */
export const DEFAULT_VAULT_URL = 'https://halo.dxos.org/vault.html';

/**
 * @deprecated
 */
// TODO(burdon): Remove need (i.e., make undefined do the right thing).
export const DEFAULT_PROFILE = 'default';

export const EXPECTED_CONFIG_VERSION = 1;
export const defaultConfig = { version: 1 };

// TODO(burdon): Allow override via env? Generalize since currently NodeJS only.
const HOME = typeof process !== 'undefined' ? (process?.env?.HOME ?? '') : '';

// XDG_CONFIG_HOME (Analogous to /etc.)
export const DX_CONFIG = `${HOME}/.config/dx`;

// XDG_CACHE_HOME (Analogous to /var/cache).
export const DX_CACHE = `${HOME}/.cache/dx`;

// TODO(burdon): Storage should use this by default (make path optional).
// XDG_DATA_HOME (Analogous to /usr/share).
export const DX_DATA = `${HOME}/.local/share/dx`;

// XDG_STATE_HOME (Analogous to /var/lib).
export const DX_STATE = `${HOME}/.local/state/dx`;

// XDG_RUNTIME_DIR (Non-essential files, sockets, etc.)
export const DX_RUNTIME = '/tmp/dx/run';

export enum DXEnv {
  CONFIG = 'DX_CONFIG',
  DEBUG = 'DX_DEBUG',
  NO_AGENT = 'DX_NO_AGENT',
  PROFILE = 'DX_PROFILE',
}

export namespace DXEnv {
  /**
   * Helper to get the value from process.env
   */
  export function get(variable: DXEnv): string | undefined;
  export function get(variable: DXEnv, defaultValue: string): string;
  export function get(variable: DXEnv, defaultValue?: string): string | undefined {
    return process.env[variable] ?? defaultValue;
  }
}

// Base directories.
// TODO(burdon): Consider Windows, Linux, OSX.
// https://wiki.archlinux.org/title/XDG_Base_Directory
// Each `/dx` directory should contain `/profile/<DX_PROFILE>` subdirectories.
export const getProfilePath = (root: string, profile: string, file: string | undefined = undefined) =>
  `${root}/profile/${profile}` + (file ? `/${file}` : '');
