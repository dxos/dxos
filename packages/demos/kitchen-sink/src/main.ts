//
// Copyright 2022 DXOS.org
//

// declare module '*.yml' {
//   export = any;
// }

import { Config, Defaults } from '@dxos/config';

const config = new Config(Defaults());

console.log(JSON.stringify(config.values, undefined, 2));
