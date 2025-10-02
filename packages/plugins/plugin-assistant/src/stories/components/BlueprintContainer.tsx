//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';

import { TemplateEditor } from '../../components';
import { meta } from '../../meta';

import { type ComponentProps } from './types';

export const BlueprintContainer = ({ space }: ComponentProps) => {
  const [blueprint] = useQuery(space, Filter.type(Blueprint.Blueprint));
  const { t } = useTranslation(meta.id);

  return !blueprint?.instructions ? (
    <p className={mx(descriptionMessage, 'm-trimLg')}>{t('no blueprint message')}</p>
  ) : (
    <div className='flex flex-col h-full'>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>
        <h2>{Obj.getLabel(blueprint)}</h2>
        <div className='flex-1' />
        <Toolbar.IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' />
      </Toolbar.Root>
      <TemplateEditor id={blueprint.id} template={blueprint.instructions} />
    </div>
  );
};
