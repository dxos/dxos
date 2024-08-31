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
        'flex h-16 w-[10rem] items-center overflow-hidden',
        'separator-separator hover:surface-hover cursor-pointer rounded-md border shadow-sm',
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-testid={testId}
    >
      <div className='separator-separator flex h-full w-12 shrink-0 items-center justify-center border-r bg-neutral-800'>
        <Icon weight='thin' className={getSize(6)} />
      </div>
      <div className='items-center overflow-hidden p-2 px-3'>
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
    <div {...domAttributes} role='none' className='flex flex-wrap items-center gap-4 p-8'>
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
