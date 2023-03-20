//
// Copyright 2023 DXOS.org
//

import urljoin from 'url-join';

import { Config } from '@dxos/client';
import { useConfig } from '@dxos/react-client';

// TODO(burdon): Config?
const endpoint = 'https://dev.kube.dxos.org/.well-known';

export class KubeClient {
  constructor(private readonly _config: Config) {}

  async fetch<T extends {}>(url: string): Promise<T> {
    const res = await fetch(urljoin(endpoint, url));
    return await res.json();
  }
}

export const useKube = (): KubeClient => {
  const config = useConfig();
  return new KubeClient(config);
};
