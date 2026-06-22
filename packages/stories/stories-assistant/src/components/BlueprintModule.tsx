//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Blueprint } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';
import { meta } from '@dxos/plugin-assistant';
import { TemplateEditor } from '@dxos/plugin-routine/components';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { type ModuleProps } from './types';

export const BlueprintModule = ({ space }: ModuleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [blueprint] = useQuery(space.db, Filter.type(Blueprint.Blueprint));
  if (!blueprint?.instructions) {
    return <p className={mx(descriptionMessage, 'm-trim-md')}>{t('no-blueprint.message')}</p>;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='border-b border-subdued-separator'>
          <Toolbar.Text>{Obj.getLabel(blueprint)}</Toolbar.Text>
          <Toolbar.IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TemplateEditor id={blueprint.id} source={blueprint.instructions.source} />
      </Panel.Content>
    </Panel.Root>
  );
};
