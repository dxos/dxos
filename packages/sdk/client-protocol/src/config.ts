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

// https://wiki.archlinux.org/title/XDG_Base_Directory
// TODO(burdon): Change to ~/.config or XDG_CONFIG_HOME

const HOME = typeof process !== 'undefined' ? process?.env?.HOME : '';

// TODO(burdon): Generalize since currently NodeJS only.
export const DX_CONFIG = `${HOME}/.config/dx`;
export const DX_CACHE = `${HOME}/.cache/dx`;
export const DX_DATA = `${HOME}/.local/share/dx`;

// TODO(burdon): Override via XDG_RUNTIME_DIR
export const DX_RUNTIME = '/tmp/dx/run';

export const ENV_DX_CONFIG = 'DX_CONFIG';
export const ENV_DX_PROFILE = 'DX_PROFILE';
export const ENV_DX_PROFILE_DEFAULT = 'default';

// TODO(burdon): Factor out to spaces.
// TODO(burdon): Defaults (with TextModel).
export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);
};
