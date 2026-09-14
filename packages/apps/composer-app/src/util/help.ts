//
// Copyright 2023 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { sleep } from '@dxos/async';
import type * as Tour from '@dxos/plugin-support/Tour';

const ensureSidebar: Tour.Step['before'] = async (capabilities: CapabilityManager.CapabilityManager) => {
  const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
  await invokePromise(LayoutOperation.UpdateSidebar, { state: 'expanded' });
  return await sleep(200);
};

// TODO(burdon): Move text to translation object.
// TODO(burdon): Prefer `data-joyride` over `data-testid`.
export const steps: Tour.Step[] = [
  {
    before: ensureSidebar,
    target: '[data-testid="spacePlugin.addSpace"]',
    title: 'Sharing',
    description: 'Create shared spaces to collaborate with others.',
    placement: 'bottom',
  },
  {
    before: ensureSidebar,
    target: '[data-testid="navtree.workspace.visible"] [data-testid="spacePlugin.createObject"]',
    title: 'Creating content',
    description: 'Press (+) to add new content.',
    placement: 'bottom',
  },
  {
    before: ensureSidebar,
    target: '[data-joyride="welcome/account"]',
    title: 'Profile',
    description: 'Manage your profile and devices.',
  },
  {
    before: ensureSidebar,
    target: '[data-testid="treeView.appSettings"]',
    title: 'Settings',
    description: 'Configure settings.',
  },
  {
    before: ensureSidebar,
    target: '[data-testid="treeView.pluginRegistry"]',
    title: 'Plugins',
    description: 'Enable plugins.',
  },
  // TODO(burdon): Open companion.
  {
    before: ensureSidebar,
    target: '[data-testid="plankHeading.companion"]',
    title: 'Companions',
    description: 'View companion surfaces.',
  },
  {
    target: '[data-joyride="welcome/feedback"]',
    title: 'Feedback',
    description: "We'd love to hear about your experience, use cases, or anything else that's on your mind.",
  },
];
