//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

// This should be executed globally to enable colors in mocha.

inspect.defaultOptions.colors = true;
process.stdout.hasColors = () => true;
