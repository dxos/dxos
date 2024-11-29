//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SidebarActionsImpl } from './SidebarActions';

export default {
  title: 'plugins/plugin-navtree/SidebarActions',
  component: SidebarActionsImpl,
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    primaryAction: {
      icon: 'ph--text-aa--regular',
      label: 'New Document',
      invoke: () => {},
    },
    secondaryActions: [
      [
        {
          icon: '',
          label: 'New Table',
          invoke: () => {},
        },
        {
          icon: '',
          label: 'New Sketch',
          invoke: () => {},
        },
      ],
      [
        {
          icon: '',
          label: 'Create Space',
          invoke: () => {},
        },
        {
          icon: '',
          label: 'Join Space',
          invoke: () => {},
        },
      ],
    ],
    moreActions: [],
  },
};

export const Default = {};
