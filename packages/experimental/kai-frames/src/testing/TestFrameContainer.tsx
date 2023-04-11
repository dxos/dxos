//
// Copyright 2023 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { MetagraphClientFake } from '@dxos/metagraph';
import { Space, TypedObject, useSpaces } from '@dxos/react-client';
import { MetagraphProvider } from '@dxos/react-metagraph';

import { FrameContextProvider, FrameRegistryContextProvider } from '../hooks';

// TODO(burdon): Convert to decorator?
// TODO(burdon): Pass in FrameDef?
export const TestFrameContainer = <T extends TypedObject>({
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
    if (spaces.length && !object) {
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
