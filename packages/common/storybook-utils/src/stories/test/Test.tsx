//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

export const TEST_ID = 'test';

export type TestProps = {
  'icon': string;
  'label': string;
  'variant'?: Next.ButtonVariant;
  'onClick'?: () => void;
  'id'?: string;
  'data-testid'?: string;
};

export const Test = (props: TestProps) => {
  return <Next.Button {...props} />;
};
