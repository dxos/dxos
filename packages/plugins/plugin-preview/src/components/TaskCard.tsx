//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Card, cardNoSpacing, cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { meta } from '../meta';
import { type PreviewProps } from '../types';

import { CardSubjectMenu } from './CardSubjectMenu';

export const TaskCard = ({ subject, role }: PreviewProps<DataType.Task>) => {
  const { title, status } = subject;
  const { t } = useTranslation(meta.id);
  return (
    <Card.SurfaceRoot role={role}>
      <div role='none' className={mx('flex items-center gap-2', cardSpacing)}>
        <Card.Heading classNames={[cardNoSpacing, 'min-is-0 flex-1 truncate']}>{title}</Card.Heading>
        <span className='dx-tag' data-hue='neutral'>
          {t(`${status} label`)}
        </span>
        <CardSubjectMenu subject={subject} />
      </div>
    </Card.SurfaceRoot>
  );
};
