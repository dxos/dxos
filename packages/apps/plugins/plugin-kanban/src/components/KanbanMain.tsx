//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Kanban as KanbanType } from '@braneframe/types';
import { Input, Main, useTranslation } from '@dxos/aurora';
import { blockSeparator, mx } from '@dxos/aurora-theme';
import { SpaceProxy } from '@dxos/client';
import { Text } from '@dxos/echo-schema';

import type { KanbanModel } from '../props';
import { Styles } from '../styles';
import { KanbanBoard } from './KanbanBoard';

// TODO(burdon): Constructor type? `data` vs. `datum`?
export const KanbanMain: FC<{ data: [SpaceProxy, KanbanType] }> = ({ data: [space, kanban] }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');

  // TODO(burdon): Should plugin create and pass in model?
  const model: KanbanModel = {
    root: kanban, // TODO(burdon): How to keep pure?
    createColumn: () => space.db.add(new KanbanType.Column()),
    // TODO(burdon): Add metadata from column in the case of projections.
    createItem: (column) =>
      space.db.add(
        new KanbanType.Item({
          // TODO(burdon): Make automatic?
          title: new Text(),
        }),
      ),
  };

  return (
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', Styles.level0.bg)}>
      <div>
        <Input.Root>
          <Input.Label srOnly>{t('kanban title label')}</Input.Label>
          {/* TODO(burdon): Is classNames boilerplate required everywhere? Make consistent across plugins? Same for separator, etc. */}
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
            autoComplete='off'
            value={model.root.title}
            onChange={({ target: { value } }) => (model.root.title = value)}
          />
        </Input.Root>
      </div>
      <div role='separator' className={mx(blockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <div className='flex grow overflow-hidden'>
        <KanbanBoard model={model} />
      </div>
    </Main.Content>
  );
};
