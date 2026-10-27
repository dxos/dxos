//
// Copyright 2026 DXOS.org
//

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';

// The same plugin the tab runs: the worker fires only its own startup event, so of this plugin's
// modules only the worker's client services activate there.
export default () => ClientPlugin.make({});
