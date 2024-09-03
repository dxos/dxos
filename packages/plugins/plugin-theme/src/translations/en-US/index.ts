//
// Copyright 2023 DXOS.org
//

import { appkit } from './appkit';
import { os } from './os';

export default (appName?: string) => ({ 'en-US': { appkit: appkit(appName), os } });
