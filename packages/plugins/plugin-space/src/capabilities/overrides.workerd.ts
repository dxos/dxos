//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Workerd-specific implementation spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declaration: the headless environments register the reduced schema list rather
// than the browser `./schema` module.
export const Schema = AppCapability.schema(() => import('../schema.headless'));
