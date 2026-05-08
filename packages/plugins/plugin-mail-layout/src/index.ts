//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const MailLayoutPlugin = Plugin.lazy(meta, () => import('./MailLayoutPlugin'));

export * from './meta';
