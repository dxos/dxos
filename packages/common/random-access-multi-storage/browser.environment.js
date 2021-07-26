//
// Copyright 2020 DxOS.
//

import pify from 'pify';

import * as testModule from './src/browser';

window.testModule = testModule;
window.Buffer = Buffer;
window.pify = pify;
