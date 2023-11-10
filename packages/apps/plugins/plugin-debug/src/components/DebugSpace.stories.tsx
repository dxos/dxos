//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { DebugSpace } from './DebugSpace';

const Story: FC = () => {
  const [space] = useSpaces();
  useEffect(() => {
    const generator = createSpaceObjectGenerator(space);
    generator.addSchemas();
  }, [space]);

  return <DebugSpace space={space} />;
};

export default {
  component: DebugSpace,
  render: Story,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
