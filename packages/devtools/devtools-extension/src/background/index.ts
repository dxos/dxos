//
// Copyright 2020 DXOS.org
//

// REQUIRED FOR THE BRIDGE TO WORK.
import Bridge from 'crx-bridge';

// TODO(burdon): No code in index file.

import { startLiveReload } from './live-reload';

void startLiveReload();

Bridge.setNamespace('dxos.devtools');
Bridge.allowWindowMessaging('dxos.devtools');

console.log('Background script loaded');
