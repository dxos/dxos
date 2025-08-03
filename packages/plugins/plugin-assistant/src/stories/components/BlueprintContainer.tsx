//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';

import { TemplateEditor } from '../../components';

import { type ComponentProps } from './types';

export const BlueprintContainer = ({ space }: ComponentProps) => {
  const [blueprint] = useQuery(space, Filter.type(Blueprint.Blueprint));
  if (!blueprint?.instructions) {
    return null;
  }

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='border-b border-subduedSeparator'>
        <h2>{Obj.getLabel(blueprint)}</h2>
      </Toolbar.Root>
      <TemplateEditor id={blueprint.id} template={blueprint.instructions} />
    </div>
  );
};
