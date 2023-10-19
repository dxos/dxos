//
// Copyright 2023 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { mx } from '@dxos/react-ui-theme';
import { MetagraphClientFake } from '@dxos/metagraph';
import { Space, TypedObject, useSpaces } from '@dxos/react-client/echo';
import { MetagraphProvider } from '@dxos/react-metagraph';

import { FrameContextProvider, FrameContextType, FrameRegistryContextProvider } from '../hooks';

export type TestFrameContainerSlots = {
  root?: {
    className?: string;
  };
};

// TODO(burdon): Convert to decorator?
// TODO(burdon): Pass in FrameDef?
export const TestFrameContainer = <T extends TypedObject>({
  children,
  onCreate,
  slots,
  state = {},
}: {
  children: ReactNode;
  onCreate: (space: Space) => Promise<T>;
  slots?: TestFrameContainerSlots;
  state?: Partial<FrameContextType>;
}) => {
  const metagraphContext = {
    client: new MetagraphClientFake([]),
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
        <div className={mx('flex w-full h-[100vh] overflow-hidden justify-center bg-paper-1-bg')}>
          <div className={mx('flex w-full h-full justify-center bg-white', slots?.root?.className)}>
            <FrameContextProvider state={{ space: spaces[0], objectId: object!.id, ...state }}>
              {children}
            </FrameContextProvider>
          </div>
        </div>
      </FrameRegistryContextProvider>
    </MetagraphProvider>
  );
};
