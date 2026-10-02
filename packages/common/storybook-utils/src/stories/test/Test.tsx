//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as IconButton from '@dxos/react-ui/IconButton';

export const TEST_ID = 'test';

export type TestProps = IconButton.RootProps;

export const Test = (props: TestProps) => {
  return <IconButton.Root {...props} />;
};
