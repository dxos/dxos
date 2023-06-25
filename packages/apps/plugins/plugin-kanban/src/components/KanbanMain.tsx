//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

import { Input, Main, useTranslation } from '@dxos/aurora';
import { defaultBlockSeparator, mx } from '@dxos/aurora-theme';
import { ObservableArray } from '@dxos/observable-object';

import { KanbanColumn, KanbanItem } from '../props';
import type { KanbanModel } from '../props';
import { KanbanBoard } from './KanbanBoard';

// TODO(burdon): Copying Stack; why array?
export const KanbanMain = ({ data: [kanban] }: { data: [kanban: KanbanModel] }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.

  // TODO(burdon): External.
  const handleAddColumn = () => {
    return {
      id: 'column-' + Math.random(),
      title: faker.lorem.words(3),
      items: new ObservableArray<KanbanItem>(),
    };
  };

  // TODO(burdon): External.
  const handleAddItem = (column: KanbanColumn) => {
    return {
      id: 'item-' + Math.random(),
      title: faker.lorem.words(3),
    };
  };

  // TODO(burdon): Style/color standards for panels, borders, etc.
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <div>
        <Input.Root>
          {/* TODO(burdon): Label shouldn't be unique per plugin? */}
          <Input.Label srOnly>{t('kanban title label')}</Input.Label>
          {/* TODO(burdon): Is classNames boilerplate required everywhere? Make consistent across plugins? Same for separator, etc. */}
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
            defaultValue={kanban.title}
            onChange={({ target: { value } }) => (kanban.title = value)}
          />
        </Input.Root>
      </div>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <div className='flex grow overflow-hidden'>
        <KanbanBoard columns={kanban.columns} onAddColumn={handleAddColumn} onAddItem={handleAddItem} />
      </div>
    </Main.Content>
  );
};
