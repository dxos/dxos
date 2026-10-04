//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';

export const TEST_ID = 'test';

export type TestProps = {
  'icon': string;
  'label': string;
  'variant'?: Button.Variant;
  'onClick'?: () => void;
  'id'?: string;
  'data-testid'?: string;
};

export const Test = (props: TestProps) => {
  return <Button.Root {...props} />;
};
