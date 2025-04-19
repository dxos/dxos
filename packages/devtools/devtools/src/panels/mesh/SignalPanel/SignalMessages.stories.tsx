//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { SignalMessageTable } from './SignalMessageTable';

export default {
  title: 'devtools/devtools/SignalMessages',
  component: SignalMessageTable,
  decorators: [withTheme],
};

export const Normal = (props: any) => {
  return <SignalMessageTable {...props} />;
};
