//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { type ModuleProps } from '@dxos/story-modules';

import { useActiveObject } from '../testing';

export const CommentsModule = ({ space }: ModuleProps) => {
  const object = useActiveObject(space);
  const data = useMemo(() => ({ attendableId: 'story', subject: 'comments', companionTo: object }), [object]);
  if (!object) {
    return null;
  }

  return <Surface.Surface type={AppSurface.Article} data={data} />;
};
