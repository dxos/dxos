//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useEffect } from 'react';

import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';

import DebugSpace from './DebugSpace';

const Story: FC = () => {
  const [space] = useSpaces();
  useEffect(() => {
    if (space) {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
    }
  }, [space]);

  if (!space) {
    return null;
  }

  return <DebugSpace space={space} />;
};

export default {
  title: 'plugin-debug/DebugSpace',
  component: DebugSpace,
  render: () => <ClientRepeater component={Story} createSpace />,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
