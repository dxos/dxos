//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Input, Main, useTranslation } from '@dxos/aurora';
import { defaultBlockSeparator, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';
import { createStore } from '@dxos/observable-object';

import { isKanban } from '../props';
import type { KanbanColumn, KanbanModel } from '../props';
import { KanbanBoard } from './KanbanBoard';

// TODO(burdon): Constructor type? `data` vs. `datum`?
export const KanbanMain: FC<{ data: unknown }> = ({ data }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');

  console.log('>>>>>>>>>>', data);

  const kanban = isKanban(data) ? data : null;
  if (!kanban) {
    return null;
  }

  // TODO(burdon): Should plugin create and pass in model?
  const model: KanbanModel = {
    root: kanban,
    // TODO(burdon): External (needs space.db)?
    createColumn: () => {
      return {
        id: PublicKey.random().toHex(),
        items: createStore([]),
      };
    },
    // TODO(burdon): Add metadata from column in the case of projections?
    createItem: (column: KanbanColumn) => {
      return {
        id: PublicKey.random().toHex(),
      };
    },
  };

  // TODO(burdon): Style/color standards for panels, borders, text, etc.
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <div>
        <Input.Root>
          <Input.Label srOnly>{t('kanban title label')}</Input.Label>
          {/* TODO(burdon): Is classNames boilerplate required everywhere? Make consistent across plugins? Same for separator, etc. */}
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
            defaultValue={model.root.title}
            onChange={({ target: { value } }) => (model.root.title = value)}
          />
        </Input.Root>
      </div>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <div className='flex grow overflow-hidden'>
        <KanbanBoard model={model} />
      </div>
    </Main.Content>
  );
};
