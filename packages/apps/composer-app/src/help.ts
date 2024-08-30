//
// Copyright 2023 DXOS.org
//

import layoutPlugin from '@dxos/plugin-deck/meta';
import { type Step } from '@dxos/plugin-help';
import { resolvePlugin, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { sleep } from '@dxos/async';

const ensureSidebar: Step['before'] = async ({ plugins }) => {
  const intent = resolvePlugin(plugins, parseIntentPlugin)!;
  await intent.provides.intent.dispatch({
    plugin: layoutPlugin.id,
    action: LayoutAction.SET_LAYOUT,
    data: { element: 'sidebar', state: true },
  });
  return await sleep(200);
};

const base: Partial<Step> = {
  disableBeacon: true,
  disableOverlay: true,
  styles: {
    options: {
      arrowColor: '#1767df', // surface-accent
    },
  },
  offset: 0,
};

// TODO(burdon): Move text to translation object.
// TODO(burdon): Prefer `data-joyride` over `data-testid`.
export const steps: Step[] = [
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.createSpace"]',
    title: 'Sharing',
    content: 'Create shared spaces to collaborate with others.',
    placement: 'bottom',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.createObject"]',
    title: 'Creating content',
    content: 'Press (+) to add new content.',
    placement: 'bottom',
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
  {
    ...base,
    target: '[data-joyride="welcome/feedback"]',
    title: 'Feedback',
    content: "We'd love to hear about your experience, use cases, or anything else that's on your mind.",
  },
];
