//
// Copyright 2023 DXOS.org
//

import { type Step } from '@braneframe/plugin-help';
import layoutPlugin from '@braneframe/plugin-layout/meta';
import { resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// TODO(burdon): Move text to translation object.
export const steps: Step[] = [
  {
    target: '[data-testid="spacePlugin.createObject"]',
    title: 'Create things',
    content: 'Use this to create new things.',
    placement: 'auto',
    disableBeacon: true,
    before: ({ plugins }) => {
      const intent = resolvePlugin(plugins, parseIntentPlugin)!;
      return intent.provides.intent
        .dispatch({
          plugin: layoutPlugin.id,
          action: LayoutAction.SET_LAYOUT,
          data: { element: 'sidebar', state: true },
        })
        .then(() => delay(200));
    },
  },
  {
    // TODO(burdon): HACK: Extend Graph Node type to support joyride targets (similar to test ids).
    target: '[data-testid="navtree.treeItem.heading"]',
    title: 'Personal space',
    content: 'Your personal space will be synchronized across your devices.',
    placement: 'right',
  },
  {
    target: '[data-joyride="welcome/halo"]',
    title: 'HALO',
    content: 'Click here to access your profile and manage devices.',
    placement: 'bottom',
    disableBeacon: true,
    floaterProps: {
      style: {
        margin: 16,
      },
    },
    before: () => {
      alert('before');
    },
  },

  {
    target: '[data-itemid="shared-spaces"]',
    title: 'Shared spaces',
    content: 'You can create multiple shared spaces to collaborate with your team.',
    placement: 'right',
  },
  {
    target: '[data-joyride="welcome/settings"]',
    title: 'Settings',
    content: 'Open settings to install and configure plugins.',
    placement: 'bottom-start',
  },
];
