//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Card } from '@dxos/react-ui-stack';

import { type Outline as OutlineType } from '../types';

import { Outline } from './Outline';

export const OutlineCard = ({ subject }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!subject.content.target) {
    return null;
  }

  return (
    <Card.SurfaceRoot id={subject.id} classNames='p-2'>
      <Outline id={subject.content.target.id} text={subject.content.target} />
    </Card.SurfaceRoot>
  );
};

export default OutlineCard;
