//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { AiBriefingSpace } from '../samples/ai-briefing/index.ts';
import { ReadingRoomSpace } from '../samples/reading-room/index.ts';

export default [
  AiBriefingSpace.makeTemplate(),
  ReadingRoomSpace.makeTemplate(),
] satisfies ReadonlyArray<AppCapabilities.SpaceTemplate>;
