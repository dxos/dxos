//
// Copyright 2022 DXOS.org
//

/* eslint-disable */

const path = require('path');
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.NODE_ENV = 'development';

global.oclif = global.oclif || {};
global.oclif.columns = 80;
