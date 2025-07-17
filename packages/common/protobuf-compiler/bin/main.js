#!/usr/bin/env node

//
// Copyright 2025 DXOS.org
//

import { register } from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
register('extensionless', `file://${__filename}`);

import('../dist/src/main.js');
