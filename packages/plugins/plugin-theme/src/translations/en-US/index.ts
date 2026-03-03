//
// Copyright 2023 DXOS.org
//

import { osTranslations } from '@dxos/ui-theme';

import { os } from './os';

export default (appName?: string) => ({ 'en-US': { [osTranslations]: os(appName) } });
