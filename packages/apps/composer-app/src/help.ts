//
// Copyright 2023 DXOS.org
//

import { Capabilities, LayoutAction, type PluginsContext, createIntent } from '@dxos/app-framework';
import { sleep } from '@dxos/async';
import { type Step } from '@dxos/plugin-help';

const ensureSidebar: Step['before'] = async (context: PluginsContext) => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
  await dispatch(
    createIntent(LayoutAction.UpdateSidebar, { part: 'sidebar', subject: 'sidebar', options: { state: 'expanded' } }),
  );
  return await sleep(200);
};

const base: Partial<Step> = {
  disableBeacon: true,
  disableOverlay: true,
  styles: {
    options: {
      arrowColor: 'var(--dx-accentSurface)',
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
