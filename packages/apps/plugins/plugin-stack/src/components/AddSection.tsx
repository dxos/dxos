//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import React, { useCallback } from 'react';

import { StackViewType, type CollectionType } from '@braneframe/types';
import { usePlugin, useIntentDispatcher } from '@dxos/app-framework';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { STACK_PLUGIN } from '../meta';
import { type StackSectionCreator, type StackPluginProvides } from '../types';

const CreatorTile = ({ Icon, label, handleAdd }: { Icon: React.FC<any>; label: string; handleAdd: () => void }) => {
  const onClick = useCallback((_: React.MouseEvent<HTMLDivElement>) => handleAdd(), [handleAdd]);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const classes = mx(
    'h-full',
    'flex items-center gap-2',
    'pli-3 plb-5',
    'border rounded-md separator-separator shadow-sm',
    'hover:surface-hover cursor-pointer',
  );

  return (
    // TODO(Zan): We should have a pure component for these large buttons?
    <div role='button' aria-label={label} tabIndex={0} className={classes} onClick={onClick} onKeyDown={onKeyDown}>
      {Icon && <Icon className={mx(getSize(6), 'shrink-0')} />}
      <span className='text-xs'>{label}</span>
    </div>
  );
};

export const AddSection = ({ collection }: { collection: CollectionType }) => {
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });
  const dispatch = useIntentDispatcher();
  const { t } = useTranslation(STACK_PLUGIN);

  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);
  const stackCreators = stackPlugin?.provides?.stack.creators ?? [];

  const handleAdd = useCallback(
    async (creator: StackSectionCreator) => {
      const { data: section } = (await dispatch(creator.intent)) ?? {};
      collection.objects = [section];
      const stack = collection.views[StackViewType.typename];
      if (stack) {
        stack.sections[section.id] = {};
      }
    },
    [collection, dispatch],
  );

  if (stackCreators.length === 0) {
    return null;
  }

  return (
    <div
      {...domAttributes}
      role='none'
      className='grid items-center gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]'
    >
      {stackCreators.map((creator) => {
        const { label, icon } = creator;
        const localizedLabel = toLocalizedString(label, t);

        return <CreatorTile key={creator.id} label={localizedLabel} Icon={icon} handleAdd={() => handleAdd(creator)} />;
      })}
    </div>
  );
};
