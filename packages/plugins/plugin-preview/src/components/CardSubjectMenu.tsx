//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ACTION_TYPE } from '@dxos/app-graph';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, type IconButtonProps, useTranslation } from '@dxos/react-ui';
import { type ActionGraphProps, DropdownMenu, MenuProvider, useMenuActions } from '@dxos/react-ui-menu';

const useSubjectMenuGroupItems = (subject: Obj.Any, activeSpace?: Space) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const result: ActionGraphProps = { edges: [], nodes: [] };
  if (activeSpace && Obj.getDXN(subject).asQueueDXN()) {
    result.nodes.push({
      type: ACTION_TYPE,
      id: `${subject.id}/add-to-space`,
      // TODO(wittjosiah): Update reference to point to db object when adding?
      data: () => dispatch(createIntent(SpaceAction.AddObject, { object: subject, target: activeSpace, hidden: true })),
      properties: {
        label: ['add object to space label', { ns: 'os' }],
        icon: 'ph--file-plus--regular',
      },
    });
  }
  result.nodes.forEach(({ id: target }) => {
    result.edges.push({ source: 'root', target });
  });

  return useMenuActions(Rx.make(result));
};

/**
 * This is a generic menu for objects that tries to infer common actions.
 */
export const CardSubjectMenu = ({
  subject,
  activeSpace,
  ...props
}: Omit<IconButtonProps, 'icon' | 'label'> & { subject: Obj.Any; activeSpace?: Space }) => {
  const { t } = useTranslation('os');
  const menuProps = useSubjectMenuGroupItems(subject, activeSpace);

  if (!activeSpace) {
    return null;
  }

  return (
    <MenuProvider {...menuProps}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton
            iconOnly
            variant='ghost'
            icon='ph--dots-three-vertical--bold'
            label={t('more options label')}
            {...props}
          />
        </DropdownMenu.Trigger>
      </DropdownMenu.Root>
    </MenuProvider>
  );
};
