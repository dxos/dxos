//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Skill } from '@dxos/compute';
import { Filter, Obj } from '@dxos/echo';
import { meta } from '@dxos/plugin-assistant';
import { TemplateEditor } from '@dxos/plugin-routine/components';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type ModuleProps } from '@dxos/story-modules';
import { descriptionMessage, mx } from '@dxos/ui-theme';

export const SkillModule = ({ space }: ModuleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [skill] = useQuery(space.db, Filter.type(Skill.Skill));
  if (!skill?.instructions) {
    return <p className={mx(descriptionMessage, 'm-trim-md')}>{t('no-skill.message')}</p>;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='border-b border-subdued-separator'>
          <Toolbar.Text>{Obj.getLabel(skill)}</Toolbar.Text>
          <Toolbar.IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TemplateEditor id={skill.id} source={skill.instructions.source} />
      </Panel.Content>
    </Panel.Root>
  );
};
