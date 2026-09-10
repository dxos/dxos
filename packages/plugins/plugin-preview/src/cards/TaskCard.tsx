//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Type } from '@dxos/echo';
import { getPropertyMetaAnnotation } from '@dxos/echo/internal';
import { SchemaAST } from '@dxos/effect';
import { Card } from '@dxos/react-ui';
import { Task } from '@dxos/types';

export const TaskCard = ({ subject }: AppSurface.ObjectCardProps<Task.Task>) => {
  const { status } = subject;
  const statusOption = getActiveStatusOption(status);

  return (
    <Card.Body>
      <Card.Row>
        {statusOption && (
          <div>
            <span className='dx-tag' data-hue={statusOption.color}>
              {statusOption.title}
            </span>
          </div>
        )}
      </Card.Row>
    </Card.Body>
  );
};

/** The option the schema's `singleSelect` property meta declares for the status, read off the `status` property. */
const getActiveStatusOption = (status?: string): Task.Option<string> | undefined => {
  const statusProperty = SchemaAST.getPropertySignatures(Type.getSchema(Task.Task).ast).find(
    (property) => property.name === 'status',
  );
  const meta =
    statusProperty && getPropertyMetaAnnotation<{ options?: Task.Option<string>[] }>(statusProperty, 'singleSelect');
  return meta?.options?.find(({ id }) => id === status);
};
