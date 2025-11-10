//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Card } from '@dxos/react-ui-stack';

import { type Outline } from '../types';

import { Outline } from './Outline';

export const OutlineCard = ({ object }: SurfaceComponentProps<Outline.Outline>) => {
  if (!object.content.target) {
    return null;
  }

  return (
    <Card.SurfaceRoot id={object.id} classNames='p-2'>
      <Outline id={object.content.target.id} text={object.content.target} />
    </Card.SurfaceRoot>
  );
};

export default OutlineCard;
