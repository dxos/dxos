//
// Copyright 2026 DXOS.org
//

import { createCoordinatorOnConnect } from '@dxos/worker-framework/coordinator';

globalThis.onconnect = createCoordinatorOnConnect();
