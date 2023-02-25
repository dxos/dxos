//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Space, Text } from '@dxos/client';
import { SpacesPage as BaseSpacesPage } from '@dxos/react-appkit';

import { ComposerDocument } from '../proto';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const createComposerDocument = useCallback(async (space: Space) => {
    await space.db.add(new ComposerDocument({ content: new Text() }));
  }, []);

  return <BaseSpacesPage onSpaceCreate={createComposerDocument} />;
};
