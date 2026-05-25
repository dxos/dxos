//
// Copyright 2023 DXOS.org
//

import { Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { sleep } from '@dxos/async';
import { type Tour } from '@dxos/plugin-support';

const ensureSidebar: Tour.Step['before'] = async (capabilities: CapabilityManager.CapabilityManager) => {
  const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
  await invokePromise(LayoutOperation.UpdateSidebar, { state: 'expanded' });
  return await sleep(200);
};

const base: Partial<Tour.Step> = {
  disableBeacon: true,
  disableOverlay: true,
  offset: 0,
  styles: {
    options: {
      arrowColor: 'var(--color-accent-surface)',
    },
  },
};

// TODO(burdon): Move text to translation object.
// TODO(burdon): Prefer `data-joyride` over `data-testid`.
export const steps: Tour.Step[] = [
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.addSpace"]',
    title: 'Sharing',
    content: 'Create shared spaces to collaborate with others.',
    placement: 'bottom',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="navtree.workspace.visible"] [data-testid="spacePlugin.createObject"]',
    title: 'Creating content',
    content: 'Press (+) to add new content.',
    placement: 'bottom',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-joyride="welcome/account"]',
    title: 'Profile',
    content: 'Manage your profile and devices.',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="treeView.appSettings"]',
    title: 'Settings',
    content: 'Configure settings.',
  },
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="treeView.pluginRegistry"]',
    title: 'Plugins',
    content: 'Enable plugins.',
  },
  // TODO(burdon): Open companion.
  {
    ...base,
    before: ensureSidebar,
    target: '[data-testid="plankHeading.companion"]',
    title: 'Companions',
    content: 'View companion surfaces.',
  },
  {
    ...base,
    target: '[data-joyride="welcome/feedback"]',
    title: 'Feedback',
    content: "We'd love to hear about your experience, use cases, or anything else that's on your mind.",
  },
];
