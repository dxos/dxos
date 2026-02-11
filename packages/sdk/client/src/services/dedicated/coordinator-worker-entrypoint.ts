//
// Copyright 2026 DXOS.org
//

import { createCoordinatorOnConnect } from './coordinator-worker';

globalThis.onconnect = createCoordinatorOnConnect();
