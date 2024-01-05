//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { Link } from './Link';
import { withTheme } from '../../testing';

export default {
  title: 'react-ui/Link',
  component: Link,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
} as any;

export const Default = { args: { children: 'Hello', href: '#' } };
