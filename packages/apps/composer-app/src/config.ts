//
// Copyright 2023 DXOS.org
//

import { Config, Defaults, Envs, Local } from '@dxos/config';
import { Remote } from '@dxos/react-client';

export const setupConfig = async () => {
  const searchParams = new URLSearchParams(window.location.search);
  // TODO(burdon): Add monolithic flag. Currently, can set `target=file://local`.
  return new Config(Remote(searchParams.get('target') ?? undefined), await Envs(), Local(), Defaults());
};
