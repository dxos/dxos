//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, type IconButtonProps } from '@dxos/react-ui';

export const TEST_ID = 'test';

export type TestProps = IconButtonProps;

export const Test = (props: TestProps) => {
  return <IconButton {...props} />;
};
