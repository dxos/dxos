//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ReadingRoomSpace } from '../samples/reading-room/index.ts';

export default [ReadingRoomSpace.makeTemplate()] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;
