//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';

import { useContextBinder } from '../../hooks';

import { type ComponentProps } from './types';

export const CommentsContainer = ({ space }: ComponentProps) => {
  const binder = useContextBinder(space);
  const object = binder?.objects.value[0].target;
  const data = useMemo(() => ({ subject: 'comments', companionTo: object }), [object]);
  if (!object) {
    return null;
  }

  return <Surface role='article' data={data} />;
};
