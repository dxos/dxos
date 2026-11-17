//
// Copyright 2026 DXOS.org
//

import * as Hooks from '@dxos/app-framework/Hooks';

import { AppCapabilities } from '../../app-framework/index.ts';

/** Whether the host contributes {@link AppCapabilities.ReadOnly}; follows the contribution as it lands. */
export const useReadOnly = (): boolean => Hooks.useOptionalCapability(AppCapabilities.ReadOnly) === true;
