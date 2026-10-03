//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, type ButtonVariant } from '@dxos/react-ui';

export const TEST_ID = 'test';

export type TestProps = {
  'icon': string;
  'label': string;
  'variant'?: ButtonVariant;
  'onClick'?: () => void;
  'id'?: string;
  'data-testid'?: string;
};

export const Test = (props: TestProps) => {
  return <Button {...props} />;
};
