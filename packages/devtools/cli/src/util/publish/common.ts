//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { table, type TableOptions } from '@dxos/cli-base';
import type { ConfigProto } from '@dxos/config';

export type PackageModule = NonNullable<NonNullable<ConfigProto['package']>['modules']>[0];
export type PackageRepo = NonNullable<NonNullable<ConfigProto['package']>['repos']>[0];

export type Logger = (message: string, ...args: any[]) => void;

export const mapModules = async (modules: PackageModule[]) => {
  const { CID } = await import('kubo-rpc-client');
  return modules.map((mod) => ({
    key: mod.name,
    bundle: CID.decode(mod.bundle!).toString(),
  }));
};

export const printModules = async (modules: PackageModule[], flags: TableOptions = {}) => {
  ux.stdout(
    table(
      await mapModules(modules),
      {
        key: {
          header: 'name',
        },
        bundle: {
          header: 'bundle',
        },
      },
      flags,
    ),
  );
};
