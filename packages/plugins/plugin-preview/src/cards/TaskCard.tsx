//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type PropertyMetaAnnotation, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { Card } from '@dxos/react-ui';
import { Task } from '@dxos/types';

export const TaskCard = ({ subject }: AppSurface.ObjectProps<Task.Task>) => {
  const { title, status } = subject;
  const statusOption = getActiveStatusOption(status);

  return (
    <Card.Content>
      <Card.Row>
        {statusOption && (
          <div>
            <span className='dx-tag' data-hue={statusOption.color}>
              {statusOption.title}
            </span>
          </div>
        )}
      </Card.Row>
    </Card.Content>
  );
};

// TODO(thure): Should this move upstream as a helper? Is there an easier way to get options?
const getActiveStatusOption = (status?: string) => {
  const properties = SchemaAST.getPropertySignatures(Task.Task.ast);
  const statusProperty = properties.find((p) => p.name === 'status');
  // TODO(thure): Typescript asserts `.type` doesn’t have `.types`, but in runtime it does.
  const statusMeta = SchemaAST.getAnnotation<PropertyMetaAnnotation>(PropertyMetaAnnotationId)(
    (statusProperty!.type as any).types[0],
  );

  // TODO(thure): Typescript asserts `statusMeta` doesn’t have `.value`, but in runtime it does.
  const options = (statusMeta as any).value.singleSelect.options as { id: string; title: string; color: string }[];
  return options.find(({ id }) => id === status);
};
