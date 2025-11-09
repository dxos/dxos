//
// Copyright 2023 DXOS.org
//

import { Remote } from '@dxos/client';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';

export const PARAM_SAFE_MODE = 'safe';
export const PARAM_LOG_LEVEL = 'log';

export const setSafeModeUrl = (on: boolean) => {
  const url = new URL(window.location.href);
  const flat = on ? 'true' : 'false';
  url.searchParams.set(PARAM_SAFE_MODE, flat);
  history.pushState({ [PARAM_SAFE_MODE]: flat }, '', url);
  return url.toString();
};

export const setupConfig = async () => {
  const sources = [await Storage(), Envs(), Local(), Defaults()];
  // Not available in the worker.
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    // TODO(burdon): Add monolithic flag. Currently, can set `target=file://local`.
    sources.splice(0, 0, Remote(searchParams.get('target') ?? undefined));
  }

  return new Config(...sources);
};
