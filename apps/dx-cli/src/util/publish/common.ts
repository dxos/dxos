//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';
import { CID } from 'ipfs-http-client';

import type { ConfigObject } from '@dxos/config';

export type PackageModule = NonNullable<NonNullable<ConfigObject['package']>['modules']>[0];
export type PackageRepo = NonNullable<NonNullable<ConfigObject['package']>['repos']>[0];
export type Logger = (message?: string, ...args: any[]) => void

export const mapModules = (modules: PackageModule[]) => {
  return modules.map(mod => ({
    key: mod.name,
    bundle: CID.decode(mod.bundle!).toString()
  }));
};

export const printModules = (modules: PackageModule[], flags = {}) => {
  CliUx.ux.table(mapModules(modules), {
    key: {
      header: 'Name'
    },
    bundle: {
      header: 'Bundle'
    }
  }, {
    ...flags
  });
};
