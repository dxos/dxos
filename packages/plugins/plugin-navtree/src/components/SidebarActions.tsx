//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, type Label, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { NAVTREE_PLUGIN } from '../meta';

type SidebarAction = {
  icon: string;
  label: Label;
  invoke: () => void;
};

export const SidebarActions = () => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const primaryAction: SidebarAction = {
    icon: '',
    label: t('document label'),
    invoke: () => {},
  };
  const secondaryActions: [SidebarAction, SidebarAction][] = [
    [
      {
        icon: '',
        label: t('table label'),
        invoke: () => {},
      },
      {
        icon: '',
        label: t('sketch label'),
        invoke: () => {},
      },
    ],
    [
      {
        icon: '',
        label: t('create space label'),
        invoke: () => {},
      },
      {
        icon: '',
        label: t('join space label'),
        invoke: () => {},
      },
    ],
  ];
  const moreActions: SidebarAction[] = [];

  return (
    <SidebarActionsImpl primaryAction={primaryAction} secondaryActions={secondaryActions} moreActions={moreActions} />
  );
};

export const SidebarActionsImpl = ({
  primaryAction,
  secondaryActions,
  moreActions,
}: {
  primaryAction: SidebarAction;
  secondaryActions: [SidebarAction, SidebarAction][];
  moreActions: SidebarAction[];
}) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  return (
    <div className='flex flex-col gap-2 is-full p-2'>
      <div className='flex gap-2'>
        <IconButton
          icon={primaryAction.icon}
          label={toLocalizedString(primaryAction.label, t)}
          classNames='flex-1'
          onClick={primaryAction.invoke}
        />
        <IconButton iconOnly icon='ph--dots-three--regular' label={t('more label')} />
      </div>
      {secondaryActions.map(([action1, action2], index) => (
        <div key={index} className='flex gap-2'>
          <IconButton
            icon={action1.icon}
            label={toLocalizedString(action1.label, t)}
            classNames='flex-1'
            onClick={action1.invoke}
          />
          <IconButton
            icon={action2.icon}
            label={toLocalizedString(action2.label, t)}
            classNames='flex-1'
            onClick={action2.invoke}
          />
        </div>
      ))}
    </div>
  );
};
