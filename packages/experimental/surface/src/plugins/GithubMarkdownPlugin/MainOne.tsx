//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useParams } from 'react-router';

import { useSpace } from '@dxos/react-client';

export const MainOne = () => {
  const { spaceSlug, documentSlug } = useParams();
  const space = useSpace(spaceSlug);
  const document = space?.db.getObjectById(documentSlug ?? 'never');
  return <h1>{document?.title ?? 'Untitled'}</h1>;
};
