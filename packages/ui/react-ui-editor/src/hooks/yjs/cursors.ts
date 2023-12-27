//
// Copyright 2023 DXOS.org
//

// Copied from https://github.com/yjs/y-codemirror.next#example.

import * as random from 'lib0/random';

const cursorColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' },
];

// Select a random color for this user.
export const cursorColor = cursorColors[random.uint32() % cursorColors.length];
