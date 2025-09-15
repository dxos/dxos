//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React from 'react';

// import { useIntentDispatcher } from '@dxos/app-framework';
import { ACTION_TYPE } from '@dxos/app-graph';
import { type AnyEchoObject } from '@dxos/echo-schema';
import { IconButton, type IconButtonProps, useTranslation } from '@dxos/react-ui';
import { type ActionGraphProps, DropdownMenu, MenuProvider, useMenuActions } from '@dxos/react-ui-menu';

const useSubjectMenuGroupItems = (subject: AnyEchoObject) => {
  // const { dispatchPromise: dispatch } = useIntentDispatcher();
  const result: ActionGraphProps = { edges: [], nodes: [] };
  result.nodes.push({
    type: ACTION_TYPE,
    id: `${subject.id}/add-to-space`,
    data: () => console.log('[TO DO]', 'add object to space', subject),
    properties: {
      label: ['add object to space label', { ns: 'os' }],
      icon: 'ph--file-plus--regular',
    },
  });
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
  ...props
}: Omit<IconButtonProps, 'icon' | 'label'> & { subject: AnyEchoObject }) => {
  const { t } = useTranslation('os');
  const menuProps = useSubjectMenuGroupItems(subject);
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
