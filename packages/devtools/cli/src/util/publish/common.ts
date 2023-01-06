//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';
import { CID } from 'ipfs-http-client';

import type { ConfigProto } from '@dxos/config';
import { TunnelResponse } from '@dxos/protocols/proto/dxos/service/publisher';

export type PackageModule = NonNullable<NonNullable<ConfigProto['package']>['modules']>[0];
export type PackageRepo = NonNullable<NonNullable<ConfigProto['package']>['repos']>[0];
export type Logger = (message?: string, ...args: any[]) => void;

export const mapModules = (modules: PackageModule[]) => {
  return modules.map((mod) => ({
    key: mod.name,
    bundle: CID.decode(mod.bundle!).toString()
  }));
};

export const mapTunnels = (tunnels: TunnelResponse[]) => {
  return tunnels.map((tunnel) => ({
    key: tunnel.name,
    enabled: tunnel.enabled,
    url: tunnel.url,
  }));
};

export const printModules = (modules: PackageModule[], flags = {}) => {
  CliUx.ux.table(
    mapModules(modules),
    {
      key: {
        header: 'Name'
      },
      bundle: {
        header: 'Bundle'
      }
    },
    {
      ...flags
    }
  );
};

export const printTunnels = (tunnels: TunnelResponse[], flags = {}) => {
  CliUx.ux.table(
    mapTunnels(tunnels),
    {
      key: {
        header: 'App'
      },
      enabled: {
        header: 'Enabled'
      },
      url: {
        header: 'URL'
      }
    },
    {
      ...flags
    }
  );
};
