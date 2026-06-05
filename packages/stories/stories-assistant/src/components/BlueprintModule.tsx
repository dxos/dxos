//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Blueprint } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';
import { meta } from '@dxos/plugin-assistant';
import { TemplateEditor } from '@dxos/plugin-assistant/components';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { type ModuleProps } from './types';

export const BlueprintModule = ({ space }: ModuleProps) => {
  const [blueprint] = useQuery(space.db, Filter.type(Blueprint.Blueprint));
  const { t } = useTranslation(meta.id);

  return !blueprint?.instructions ? (
    <p className={mx(descriptionMessage, 'm-trim-md')}>{t('no-blueprint.message')}</p>
  ) : (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='border-b border-subdued-separator'>
        <h2>{Obj.getLabel(blueprint)}</h2>
        <div className='flex-1' />
        <Toolbar.IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' />
      </Toolbar.Root>
      <TemplateEditor id={blueprint.id} source={blueprint.instructions.source} />
    </div>
  );
};
