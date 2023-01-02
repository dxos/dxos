//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Space } from '@dxos/client';
import { SpacesPage as BaseSpacesPage } from '@dxos/react-appkit';
import { TextModel } from '@dxos/text-model';

import { COMPOSER_DOCUMENT } from '../containers';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const createComposerDocument = useCallback(async (space: Space) => {
    await space.database.createItem({
      model: TextModel,
      type: COMPOSER_DOCUMENT
    });
  }, []);
  return <BaseSpacesPage onSpaceCreate={createComposerDocument} />;
};
