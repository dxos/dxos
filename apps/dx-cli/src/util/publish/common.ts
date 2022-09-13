//
// Copyright 2022 DXOS.org
//

import type { ConfigObject } from '@dxos/config';

export type PackageModule = NonNullable<NonNullable<ConfigObject['package']>['modules']>[0];
export type PackageRepo = NonNullable<NonNullable<ConfigObject['package']>['repos']>[0];
export type Logger = (message?: string, ...args: any[]) => void
