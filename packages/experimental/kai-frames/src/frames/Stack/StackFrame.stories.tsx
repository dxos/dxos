//
// Copyright 2023 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { MetagraphClientFake } from '@dxos/metagraph';
import { Space, TypedObject, useSpaces } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { MetagraphProvider } from '@dxos/react-metagraph';

import { FrameContextProvider, FrameRegistryContextProvider } from '../../hooks';
import StackFrame from './StackFrame';
import { StackFrameRuntime } from './defs';

import '@dxosTheme';

export default {
  component: StackFrame,
  parameters: {
    layout: 'fullscreen'
  }
};

// TODO(burdon): Factor out and convert to decorator?
// TODO(burdon): Pass in FrameDef?
export const FrameContainer = <T extends TypedObject>({
  children,
  onCreate
}: {
  children: ReactNode;
  onCreate: (space: Space) => Promise<T>;
}) => {
  const metagraphContext = {
    client: new MetagraphClientFake([])
  };

  const [object, setObject] = useState<TypedObject>();
  const spaces = useSpaces();
  useEffect(() => {
    if (spaces.length) {
      setTimeout(async () => {
        const space = spaces[0];
        const object = await onCreate(space);
        setObject(object);
      });
    }
  }, [spaces]);

  if (!object) {
    return null;
  }

  return (
    <MetagraphProvider value={metagraphContext}>
      <FrameRegistryContextProvider>
        <div className='flex w-full h-[100vh] overflow-hidden justify-center bg-paper-1-bg'>
          <div className='flex w-[700px] h-full bg-white'>
            <FrameContextProvider state={{ space: spaces[0], objectId: object!.id }}>{children}</FrameContextProvider>
          </div>
        </div>
      </FrameRegistryContextProvider>
    </MetagraphProvider>
  );
};

export const Default = {
  decorators: [ClientSpaceDecorator()],
  render: () => (
    <FrameContainer<DocumentStack> onCreate={StackFrameRuntime.onCreate!}>
      <StackFrame />
    </FrameContainer>
  )
};
