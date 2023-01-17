//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';

import { createSpacePath, matchSpaceKey, FrameContainer } from '../app';
import { FrameID, SpaceContext, SpaceContextType, useActiveFrames } from '../hooks';

/**
 * Home page with current space.
 */
export const SpacePage = () => {
  const navigate = useNavigate();
  const frames = useActiveFrames();
  const [context, setContext] = useState<SpaceContextType | undefined>();
  const { spaceKey: currentSpaceKey, frame } = useParams();
  const spaces = useSpaces();
  const space = currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined;

  // Change space.
  useEffect(() => {
    if (space) {
      setContext({ space });
    } else {
      navigate('/');
    }
  }, [space]);

  // Change to default view.
  useEffect(() => {
    if (space && (!frame || !frames.find(({ id }) => id === frame))) {
      navigate(createSpacePath(space.key, FrameID.DASHBOARD));
    }
  }, [currentSpaceKey, frame]);

  if (!context) {
    return null;
  }

  // prettier-ignore
  return (
    <SpaceContext.Provider value={context}>
      {frame && <FrameContainer frame={frame} />}
    </SpaceContext.Provider>
  );
};
