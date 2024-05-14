//
// Copyright 2023 DXOS.org
//

import { type Step } from '@braneframe/plugin-help';
import layoutPlugin from '@braneframe/plugin-layout/meta';
import { resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureSidebar: Step['before'] = ({ plugins }) => {
  const intent = resolvePlugin(plugins, parseIntentPlugin)!;
  return intent.provides.intent
    .dispatch({
      plugin: layoutPlugin.id,
      action: LayoutAction.SET_LAYOUT,
      data: { element: 'sidebar', state: true },
    })
    .then(() => delay(200));
};

const base: Partial<Step> = {
  disableBeacon: true,
  disableOverlay: true,
  styles: {
    options: {
      arrowColor: '#1767df', // surface-accent
    },
  },
};

// TODO(burdon): Move text to translation object.
export const steps: Step[] = [
  {
    // TODO(burdon): HACK: Extend Graph Node type to support joyride targets (similar to test ids).
    ...base,
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.personalSpace"]',
    title: 'Private information',
    content: 'The Personal space is synchronized across all of your devices.',
    placement: 'right',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.createObject"]',
    title: 'Creating content',
    content: 'Press (+) to add new content.',
    placement: 'right',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.createSpace"]',
    title: 'Sharing',
    content: 'Create shared spaces to collaborate with others.',
    placement: 'right',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-joyride="welcome/halo"]',
    title: 'Profile',
    content: 'Manage your profile and devices.',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-joyride="welcome/settings"]',
    title: 'Settings',
    content: 'Configure settings and add plugins.',
  },
];
