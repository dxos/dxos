//
// Copyright 2023 DXOS.org
//

import { type Step } from 'react-joyride';

// TODO(burdon): Move text to translation object.
export const steps: Step[] = [
  {
    target: 'main',
    title: 'Welcome to Composer',
    content: 'Composer is an extensible, open source platform for collaboration and knowledge management.',
    placement: 'center',
  },
  {
    target: '[data-joyride="welcome/halo"]',
    title: 'HALO',
    content: 'Click here to access your profile and manage devices.',
    placement: 'right',
    disableBeacon: true,
    floaterProps: {
      style: {
        margin: 16,
      },
    },
  },
  {
    // TODO(burdon): HACK: Extend Graph Node type to support joyride targets (similar to test ids).
    target: '[data-testid="navtree.treeItem.heading"]',
    title: 'Personal space',
    content: 'Your personal space contains data that will be synchronized across your devices.',
    placement: 'right',
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
    placement: 'bottom',
  },
];
