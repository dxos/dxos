//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { useArrowNavigationGroup } from '@fluentui/react-tabster';

import { StackViewType, type CollectionType } from '@braneframe/types';
import { usePlugin, useIntentDispatcher } from '@dxos/app-framework';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { STACK_PLUGIN } from '../meta';
import { type StackPluginProvides } from '../types';

const CreatorTile = ({ creator, collection }: { creator: any; collection: CollectionType }) => {
  const dispatch = useIntentDispatcher();
  const { t } = useTranslation(STACK_PLUGIN);
  const { icon: Icon, label } = creator;

  const handleAdd = useCallback(async () => {
    const { data: section } = (await dispatch(creator.intent)) ?? {};
    collection.objects = [section];
    const stack = collection.views[StackViewType.typename];
    if (stack) {
      stack.sections[section.id] = {};
    }
  }, [collection]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const localized = toLocalizedString(label, t);

  const classes = mx(
    'h-full',
    'flex items-center gap-2',
    'pli-3 plb-5',
    'border rounded-md separator-separator shadow-sm',
    'hover:surface-hover cursor-pointer',
  );

  return (
    <div
      role='button'
      aria-label={localized}
      tabIndex={0}
      className={classes}
      onClick={handleAdd}
      onKeyDown={onKeyDown}
    >
      {Icon && <Icon className={mx(getSize(6), 'shrink-0')} />}
      <span className='text-xs'>{localized}</span>
    </div>
  );
};

export const AddSection = ({ collection }: { collection: CollectionType }) => {
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });

  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);
  const stackCreators = stackPlugin?.provides?.stack.creators ?? [];
  if (stackCreators.length === 0) {
    return null;
  }

  return (
    <div
      {...domAttributes}
      role='none'
      className='grid items-center gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]'
    >
      {stackCreators.map((creator) => (
        <CreatorTile key={creator.id} collection={collection} creator={creator} />
      ))}
    </div>
  );
};
