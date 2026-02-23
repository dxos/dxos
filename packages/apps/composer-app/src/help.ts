//
// Copyright 2023 DXOS.org
//

import { Capabilities, type CapabilityManager } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { sleep } from '@dxos/async';
import { type Step } from '@dxos/plugin-help';

const ensureSidebar: Step['before'] = async (capabilities: CapabilityManager.CapabilityManager) => {
  const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
  await invokePromise(LayoutOperation.UpdateSidebar, { state: 'expanded' });
  return await sleep(200);
};

const base: Partial<Step> = {
  disableBeacon: true,
  disableOverlay: true,
  styles: {
    options: {
      arrowColor: 'var(--dx-accent-surface)',
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
    target: '[data-testid="spacePlugin.addSpace"]',
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
    content: 'Add plugins.',
  },
  {
    ...base,
    target: '[data-joyride="welcome/feedback"]',
    title: 'Feedback',
    content: "We'd love to hear about your experience, use cases, or anything else that's on your mind.",
  },
];
