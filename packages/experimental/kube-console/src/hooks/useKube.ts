//
// Copyright 2023 DXOS.org
//

import urljoin from 'url-join';

import { Config } from '@dxos/client';
import { useConfig } from '@dxos/react-client';

export class KubeClient {
  private readonly _endpoint: string;

  constructor(private readonly _config: Config) {
    // TODO(burdon): Is the proto config correct?
    this._endpoint = 'https://kube.dxos.org/.well-known';
    //   this._config.values.runtime?.services?.kube?.endpoints?.services ?? `${window.location.origin}/.well-known`;
  }

  async fetch<T extends {}>(url: string): Promise<T> {
    const res = await fetch(urljoin(this._endpoint, url));
    return await res.json();
  }
}

export const useKube = (): KubeClient => {
  const config = useConfig();
  return new KubeClient(config);
};
