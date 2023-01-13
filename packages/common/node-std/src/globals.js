//
// Copyright 2022 DXOS.org
//

import { Buffer } from 'buffer/';
import process from 'process/';

globalThis.global = globalThis;
globalThis.Buffer = Buffer;
globalThis.process = process;
