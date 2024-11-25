//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type NodeArg } from '@dxos/app-graph';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NavTreeItemAction, type NavTreeItemActionMenuProps } from './NavTreeItemAction';

const parent = {
  id: faker.string.uuid(),
  type: 'node',
  data: null,
  properties: {
    label: faker.lorem.words(2),
    icon: 'ph--circle--regular',
  },
} satisfies NodeArg<any>;

// TODO(burdon): Factor out across tests.
const menuActions = faker.helpers.multiple(
  () =>
    ({
      id: faker.string.uuid(),
      type: 'action',
      data: () => {
        console.log('invoke');
      },
      properties: {
        label: faker.lorem.words(2),
        icon: 'ph--circle--regular',
      },
    }) satisfies NodeArg<any>,
  { count: 20 },
);

export default {
  title: 'plugins/plugin-navtree/NavTreeItemAction',
  component: NavTreeItemAction,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
  args: {
    icon: 'ph--list--regular',
    parent,
    menuActions,
    label: 'Select action',
    onAction: (action) => {
      console.log(action);
    },
  } satisfies Partial<NavTreeItemActionMenuProps>,
};

export const Default = {};

export const SearchList = { args: { menuType: 'searchList' } };
