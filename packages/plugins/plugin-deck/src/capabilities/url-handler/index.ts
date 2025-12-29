//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const UrlHandler = Capability.lazy('UrlHandler', () => import('./url-handler'));

