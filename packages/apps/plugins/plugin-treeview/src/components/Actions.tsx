//
// Copyright 2023 DXOS.org
//

import React, { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { SessionNode, useResolvedData } from '@braneframe/plugin-session';
import { Button, DropdownMenu, Tooltip, useSidebar, useTranslation } from '@dxos/aurora';

import { TREE_VIEW_PLUGIN } from '../types';

export const ActionItem = ({
  action,
  suppressNextTooltip,
  setOptionsMenuOpen,
}: {
  action: SessionNode;
  suppressNextTooltip: MutableRefObject<boolean>;
  setOptionsMenuOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const invoke = useResolvedData(action.id);
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  return (
    <DropdownMenu.Item
      key={action.id}
      onClick={(event) => {
        if (action.params?.disabled) {
          return;
        }
        event.stopPropagation();
        // todo(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
        suppressNextTooltip.current = true;
        setOptionsMenuOpen(false);
        void invoke(action);
      }}
      classNames='gap-2'
      disabled={!!action.params?.disabled}
    >
      {/* {action.params?.icon && <action.params.icon className={getSize(4)} />} */}
      <span>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
    </DropdownMenu.Item>
  );
};

export const PrimaryAction = ({ action }: { action: SessionNode }) => {
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const invoke = useResolvedData(action.id);
  const { sidebarOpen } = useSidebar();

  return (
    <Tooltip.Root>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[31]'>
          {Array.isArray(action.label) ? t(...action.label) : action.label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
      <Tooltip.Trigger asChild>
        <Button
          variant='ghost'
          classNames='shrink-0 pli-2 pointer-fine:pli-1'
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.stopPropagation();
              void invoke();
            }
          }}
          onClick={() => {
            void invoke;
          }}
          {...(action.params?.testId && { 'data-testid': action.params!.testId })}
          {...(!sidebarOpen && { tabIndex: -1 })}
        >
          <span className='sr-only'>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
          {/* {action.params?.icon ? <primaryAction.icon className={getSize(4)} /> : <Placeholder className={getSize(4)} />} */}
        </Button>
      </Tooltip.Trigger>
    </Tooltip.Root>
  );
};
