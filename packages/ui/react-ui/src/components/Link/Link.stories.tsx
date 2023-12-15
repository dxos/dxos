//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { Link } from './Link';
import { withTheme } from '../../testing';

export default {
  component: Link,
  decorators: [withTheme],
} as any;

export const Default = { args: { children: 'Hello', href: '#' } };
