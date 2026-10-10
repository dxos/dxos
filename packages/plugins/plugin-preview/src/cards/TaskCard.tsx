//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { getPropertyMetaAnnotation } from '@dxos/echo/internal';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as Card from '@dxos/react-ui/Card';
import { Task } from '@dxos/types';

export const TaskCard = ({ subject }: AppSurface.ObjectCardProps<Task.Task>) => {
  const [status] = useObject(subject, 'status');
  const statusOption = getActiveStatusOption(status);

  return (
    <Card.Body>
      <Card.Row>
        {statusOption && (
          <div>
            <span className='dx-tag dx-tag-inline' data-hue={statusOption.color}>
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
