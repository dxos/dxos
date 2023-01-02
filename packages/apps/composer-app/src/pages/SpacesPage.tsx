//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Space } from '@dxos/client';
import { SpacesPage as BaseSpacesPage } from '@dxos/react-appkit';
import { DOCUMENT_TYPE } from '@dxos/react-composer';
import { TextModel } from '@dxos/text-model';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const createComposerDocument = useCallback(async (space: Space) => {
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  }, []);
  return <BaseSpacesPage onSpaceCreate={createComposerDocument} />;
};
