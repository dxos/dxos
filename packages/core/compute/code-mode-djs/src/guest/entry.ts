//
// Copyright 2026 DXOS.org
//

// First, so the web globals exist before any library module initializes.
import './polyfills.ts';

import { GUEST_GLOBAL } from '../protocol.ts';
import * as Runtime from './runtime.ts';

Object.assign(globalThis, { [GUEST_GLOBAL]: Runtime });
