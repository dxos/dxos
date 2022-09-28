//
// Copyright 2022 DXOS.org
//

import { join } from 'path';

export const DOCS_PATH = join(__dirname, '../docs');

export const PINNED_PACKAGES = [
  '@dxos/client',
  '@dxos/react-client'
];

export const API_SECTIONS = [
  ['interfaces', 'Interfaces'],
  ['types', 'Types'],
  ['enums', 'Enums'],
  ['classes', 'Classes'],
  ['functions', 'Functions'],
  ['variables', 'Constants']
];
