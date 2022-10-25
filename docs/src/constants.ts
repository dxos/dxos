//
// Copyright 2022 DXOS.org
//

import { resolve } from 'path';

export const DOCS_PATH = resolve(__dirname, '../docs');

export const PINNED_PACKAGES = ['@dxos/client', '@dxos/react-client'];

export const API_SECTIONS = [
  'values',
  'enums',
  'types',
  'interfaces',
  'classes',
  'functions'
];

// [
// ['interfaces', 'Interfaces'],
// ['types', 'Types'],
// ['enums', 'Enums'],
// ['classes', 'Classes'],
// ['functions', 'Functions'],
// ['variables', 'Constants']
// ];
