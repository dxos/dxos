//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';

import { createSpacePath, matchSpaceKey, ViewContainer, viewConfig } from '../app';
import { AppStateProvider, SpaceContext, SpaceContextType, useOptions } from '../hooks';

/**
 * Home page with current space.
 */
export const SpacePage = () => {
  const navigate = useNavigate();
  const { views } = useOptions();
  const [context, setContext] = useState<SpaceContextType | undefined>();
  const { spaceKey: currentSpaceKey, view } = useParams();
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

  // Change view.
  useEffect(() => {
    if (space && (!view || !viewConfig[view])) {
      navigate(createSpacePath(space.key, views[0]));
    }
  }, [view, currentSpaceKey]);

  if (!context) {
    return null;
  }

  // prettier-ignore
  return (
    <AppStateProvider>
      <SpaceContext.Provider value={context}>
        {view && <ViewContainer view={view} />}
      </SpaceContext.Provider>
    </AppStateProvider>
  );
};
