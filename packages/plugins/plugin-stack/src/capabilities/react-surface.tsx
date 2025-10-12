//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { StackMain } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${meta.id}/article`,
      role: 'article',
      filter: (data): data is { id?: string; subject: DataType.Collection } =>
        Obj.instanceOf(DataType.Collection, data.subject),
      component: ({ data }) => {
        // This allows the id to be overridden by the surface for situations where the id of the collection
        // is not the same as the id of what is being represented (e.g., a space with a root collection).
        const id = typeof data.id === 'string' ? data.id : undefined;
        return (
          <div role='none' className='overflow-auto' style={{ contain: 'layout' }}>
            <StackMain id={id ?? fullyQualifiedId(data.subject)} collection={data.subject} />
          </div>
        );
      },
    }),
  );
