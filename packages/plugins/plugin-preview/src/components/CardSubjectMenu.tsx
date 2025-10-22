//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ACTION_TYPE } from '@dxos/app-graph';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { IconButton, type IconButtonProps, useTranslation } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  DropdownMenu,
  type MenuActions,
  MenuProvider,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { meta } from '../meta';
import { type PreviewProps } from '../types';

/**
 * Generic menu for objects that tries to infer common actions.
 */
export const CardSubjectMenu = ({
  subject,
  activeSpace,
  ...props
}: PreviewProps & Omit<IconButtonProps, 'icon' | 'label'>) => {
  const { t } = useTranslation(meta.id);
  const menuProps = useSubjectMenuGroupItems({ subject, activeSpace });

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

const useSubjectMenuGroupItems = ({ subject, activeSpace }: PreviewProps): MenuActions => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const result: ActionGraphProps = { edges: [], nodes: [] };

  result.nodes.push({
    type: ACTION_TYPE,
    id: `${subject.id}/open`,
    data: () => dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(subject)] })),
    properties: {
      label: ['open object label', { ns: meta.id }],
      icon: 'ph--arrow-right--regular',
    },
  });

  if (activeSpace && Obj.getDXN(subject).asQueueDXN()) {
    result.nodes.push({
      type: ACTION_TYPE,
      id: `${subject.id}/add-to-space`,
      // TODO(wittjosiah): Update reference to point to db object when adding?
      data: () => dispatch(createIntent(SpaceAction.AddObject, { object: subject, target: activeSpace, hidden: true })),
      properties: {
        label: ['add object to space label', { ns: meta.id }],
        icon: 'ph--file-plus--regular',
      },
    });
  }

  result.nodes.forEach(({ id: target }) => {
    result.edges.push({ source: 'root', target });
  });

  return useMenuActions(Rx.make(result));
};
