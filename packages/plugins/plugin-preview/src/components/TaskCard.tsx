//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import React from 'react';

import { type PropertyMetaAnnotation, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { Card, cardNoSpacing, cardSpacing } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { type PreviewProps } from '../types';

import { CardSubjectMenu } from './CardSubjectMenu';

// TODO(thure): Should this move upstream as a helper? Is there an easier way to get options?
const getActiveStatusOption = (status?: string) => {
  const properties = SchemaAST.getPropertySignatures(DataType.Task.ast);
  const statusProperty = properties.find((p) => p.name === 'status');
  const statusMeta = SchemaAST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(
    // TODO(thure): Typescript asserts `.type` doesn’t have `.types`, but in runtime it does.
    (statusProperty!.type as any).types[0],
  );
  const options = // TODO(thure): Typescript asserts `statusMeta` doesn’t have `.value`, but in runtime it does.
    (statusMeta as any).value.singleSelect.options as { id: string; title: string; color: string }[];
  return options.find(({ id }) => id === status);
};

export const TaskCard = ({ subject, role, activeSpace }: PreviewProps<DataType.Task>) => {
  const { title, status } = subject;
  const statusOption = getActiveStatusOption(status);
  return (
    <Card.SurfaceRoot role={role}>
      <div role='none' className={mx('flex items-center gap-2', cardSpacing)}>
        <Card.Heading classNames={[cardNoSpacing, 'min-is-0 flex-1 truncate']}>{title}</Card.Heading>
        {statusOption && (
          <span className='dx-tag' data-hue={statusOption.color}>
            {statusOption.title}
          </span>
        )}
        <CardSubjectMenu subject={subject} activeSpace={activeSpace} />
      </div>
    </Card.SurfaceRoot>
  );
};
