//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';

export const KUBE_TAG = 'kube';

export const DEFAULT_PROVIDER = 'digitalocean';

export interface KubeDeployOptions {
  hostname: string;
  region?: string;
  memory?: number;
  dev: boolean;
  accessToken?: string
}

export type KUBE = {
  hostname: string;
  createdAt: string;
  ipAddress: string;
};

export interface Provider {
  /**
   * Deploy KUBE to a Provider.
   */
  deploy(options: KubeDeployOptions): Promise<KUBE>;
  getSshKeys(): Promise<any>;
}

export const mapKubes = (kubes: KUBE[]) => {
  return kubes.map((kube) => ({
    key: kube.hostname,
    ipAddress: kube.ipAddress
  }));
};

export const printKubes = (kubes: KUBE[], flags = {}) => {
  CliUx.ux.table(
    mapKubes(kubes),
    {
      key: {
        header: 'Hostname'
      },
      ipAddress: {
        header: 'IP Address'
      }
    },
    {
      ...flags
    }
  );
};
