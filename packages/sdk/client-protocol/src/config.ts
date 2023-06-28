//
// Copyright 2022 DXOS.org
//

import { ConfigProto } from '@dxos/config';
import { DocumentModel } from '@dxos/document-model';
import { ModelFactory } from '@dxos/model-factory';
import { TextModel } from '@dxos/text-model';

export const DEFAULT_INTERNAL_CHANNEL = 'dxos:vault';
export const DEFAULT_CLIENT_CHANNEL = 'dxos:app';
export const DEFAULT_SHELL_CHANNEL = 'dxos:shell';

export const DEFAULT_CLIENT_ORIGIN = 'https://halo.dxos.org/vault.html';

export const EXPECTED_CONFIG_VERSION = 1;
export const defaultConfig: ConfigProto = { version: 1 };

// TODO(burdon): Allow override via env? Generalize since currently NodeJS only.
const HOME = typeof process !== 'undefined' ? process?.env?.HOME ?? '' : '';

// Base directories.
// TODO(burdon): Consider Windows, Linux, OSX.
// https://wiki.archlinux.org/title/XDG_Base_Directory
// Each `/dx` directory should contain `/profile/<DX_PROFILE>` subdirectories.

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

export const ENV_DX_CONFIG = 'DX_CONFIG';
export const ENV_DX_PROFILE = 'DX_PROFILE';
export const ENV_DX_PROFILE_DEFAULT = 'default';

// TODO(burdon): Factor out to spaces.
// TODO(burdon): Defaults (with TextModel).
export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);
};
