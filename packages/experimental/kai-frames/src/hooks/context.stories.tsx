//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ClientProvider, Config, Space, useClient } from '@dxos/react-client';

import { FrameContextProvider, useFrameContext } from './useFrameContext';

export default {
  component: FrameContextProvider,
  parameters: {
    layout: 'fullscreen'
  }
};

const TestFrame = () => {
  const { space } = useFrameContext();
  return <div>{space!.key.toHex()}</div>;
};

// TODO(burdon): Convert to decorator?
const TestApp = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  useEffect(() => {
    setTimeout(async () => {
      const space = await client.createSpace();
      setSpace(space);
    });
  }, []);

  if (!space) {
    return null;
  }

  return (
    <FrameContextProvider state={{ space }}>
      <TestFrame />
    </FrameContextProvider>
  );
};

const Test = () => {
  const config = new Config({});

  return (
    <ClientProvider config={config}>
      <TestApp />
    </ClientProvider>
  );
};

export const Default = {
  render: () => <Test />
};
