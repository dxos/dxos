//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { SpaceSettings } from './SpaceSettings';

export default {
  component: SpaceSettings,
  decorators: [ClientSpaceDecorator()],
};

const Test = () => {
  const spaces = useSpaces();
  const space = spaces[0];
  if (!space) {
    return null;
  }

  return <SpaceSettings space={space} />;
};

export const Default = {
  render: () => <Test />,
};
