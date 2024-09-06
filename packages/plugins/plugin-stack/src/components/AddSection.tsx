//
// Copyright 2024 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { type IconProps } from '@phosphor-icons/react';
import React, { type FC, type KeyboardEvent, type MouseEvent, useCallback } from 'react';

import { usePlugin, useIntentDispatcher } from '@dxos/app-framework';
import { type CollectionType } from '@dxos/plugin-space/types';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { STACK_PLUGIN } from '../meta';
import { StackViewType, type StackSectionCreator, type StackPluginProvides } from '../types';

const CreatorTile = ({
  Icon,
  label,
  testId,
  handleAdd,
}: {
  Icon: FC<IconProps>;
  testId: string;
  label: string;
  handleAdd: () => void;
}) => {
  const onClick = useCallback((_: MouseEvent<HTMLDivElement>) => handleAdd(), [handleAdd]);
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div
      role='button'
      aria-label={label}
      tabIndex={0}
      className={mx(
        'flex items-center w-[10rem] h-16 overflow-hidden',
        'border rounded-md border-separator shadow-sm hover:bg-bg-hover cursor-pointer',
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-testid={testId}
    >
      <div className='flex h-full w-12 items-center justify-center bg-neutral-800 shrink-0 border-r border-separator'>
        <Icon weight='thin' className={getSize(6)} />
      </div>
      <div className='overflow-hidden items-center p-2 px-3'>
        <span className='capitalize'>{label}</span>
      </div>
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
    <div {...domAttributes} role='none' className='flex flex-wrap items-center p-8 gap-4'>
      {stackCreators.map((creator) => {
        const { id, type, icon, testId } = creator;
        return (
          <CreatorTile
            key={id}
            label={toLocalizedString(type, t)}
            testId={testId}
            Icon={icon}
            handleAdd={() => handleAdd(creator)}
          />
        );
      })}
    </div>
  );
};
