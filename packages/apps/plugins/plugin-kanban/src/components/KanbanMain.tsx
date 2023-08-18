//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Kanban as KanbanType } from '@braneframe/types';
import { Input, Main, useTranslation } from '@dxos/aurora';
import { baseSurface, blockSeparator, fixedFullLayout, mx } from '@dxos/aurora-theme';
import { SpaceProxy } from '@dxos/client/echo';

import { KANBAN_PLUGIN, type KanbanModel } from '../types';
import { KanbanBoard } from './KanbanBoard';

export const KanbanMain: FC<{ data: { space: SpaceProxy; object: KanbanType } }> = ({ data: { space, object } }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);

  // TODO(burdon): Should plugin create and pass in model?
  const model: KanbanModel = {
    root: object, // TODO(burdon): How to keep pure?
    createColumn: () => space.db.add(new KanbanType.Column()),
    // TODO(burdon): Add metadata from column in the case of projections.
    createItem: (column) =>
      space.db.add(
        new KanbanType.Item({
          // TODO(burdon): Make automatic? Creates additional Text object!
          // title: new Text(),
        }),
      ),
  };

  return (
    <Main.Content classNames={[fixedFullLayout, baseSurface]}>
      <div>
        <Input.Root>
          <Input.Label srOnly>{t('kanban title label')}</Input.Label>
          {/* TODO(burdon): Is classNames boilerplate required everywhere? Make consistent across plugins? Same for separator, etc. */}
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
            autoComplete='off'
            placeholder={t('kanban title placeholder')}
            value={model.root.title ?? ''}
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
