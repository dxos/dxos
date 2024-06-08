//
// Copyright 2022 DXOS.org
//

export const KUBE_TAG = 'kube';

export const DEFAULT_PROVIDER = 'digitalocean';

export interface KubeDeployOptions {
  hostname: string;
  region?: string;
  memory?: number;
  dev: boolean;
  accessToken?: string;
}

export type KUBE = {
  hostname: string;
  createdAt: string;
  ipAddress: string;
};

export interface MachineryProvider {
  /**
   * Deploy KUBE to a Provider.
   */
  deploy(options: KubeDeployOptions): Promise<KUBE>;
}

export const mapKubes = (kubes: KUBE[]) => {
  return kubes.map((kube) => ({
    key: kube.hostname,
    ipAddress: kube.ipAddress,
  }));
};

export const printKubes = (kubes: KUBE[], flags = {}) => {
  // ux.table(
  //   mapKubes(kubes),
  //   {
  //     key: {
  //       header: 'hostname',
  //     },
  //     ipAddress: {
  //       header: 'ip address',
  //     },
  //   },
  //   {
  //     ...flags,
  //   },
  // );
};
