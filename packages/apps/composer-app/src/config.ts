//
// Copyright 2023 DXOS.org
//

import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { Remote } from '@dxos/react-client';

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
