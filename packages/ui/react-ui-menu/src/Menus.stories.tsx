//
// Copyright 2024 DXOS.org
//

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Menus as NaturalMenus } from './Menus';

faker.seed(1234);

export default {
  title: 'ui/react-ui-menu/Menus',
  component: NaturalMenus,
  decorators: [withTheme],
  // parameters: { translations },
};

export const Menus = {};
