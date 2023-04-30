//
// Copyright 2022 DXOS.org
//

import React, { FC, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Space } from '@dxos/client';
import { FrameContextProvider, FrameState, FrameDef } from '@dxos/kai-frames';

import { createPath, useAppReducer } from '../../hooks';

/**
 * Frame component container and context.
 */
export const FrameContainer: FC<{ space: Space; frame: FrameDef<any>; objectId?: string; fullscreen?: boolean }> = ({
  space,
  frame,
  objectId,
  fullscreen
}) => {
  const { setFullscreen } = useAppReducer();
  const navigate = useNavigate();

  // TODO(burdon): Remove.
  // Auto-create first object.
  useEffect(() => {
    if (frame.runtime.filter && frame.runtime.autoCreate) {
      const { objects } = space.db.query(frame.runtime.filter());
      // TODO(burdon): Race condition?
      if (objects.length === 0) {
        setTimeout(async () => {
          const object = await frame.runtime.onCreate?.(space);
          navigate(createPath({ spaceKey: space.key, frame: frame.module.id, objectId: object.id }));
        });
      }
    }
  }, [space]);

  const Component = frame.runtime.Component;
  if (!Component) {
    return null;
  }

  const handleStateChange = (state: FrameState) => {
    if (state.space) {
      navigate(createPath({ spaceKey: state.space?.key, frame: state.frame?.module.id, objectId: state.objectId }));
    }

    if (state.fullscreen !== undefined) {
      setFullscreen(state.fullscreen);
    }
  };

  return (
    <div className='flex flex-col w-full overflow-hidden'>
      <FrameContextProvider state={{ space, frame, objectId, fullscreen, onStateChange: handleStateChange }}>
        <Suspense>
          <Component />
        </Suspense>
      </FrameContextProvider>
    </div>
  );
};
