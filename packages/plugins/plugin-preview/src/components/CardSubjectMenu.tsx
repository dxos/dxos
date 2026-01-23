//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { Node } from '@dxos/app-graph';
import { Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { IconButton, type IconButtonProps, useTranslation } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  DropdownMenu,
  type MenuActions,
  MenuProvider,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { meta } from '../meta';
import { type CardPreviewProps } from '../types';

/**
 * Generic menu for objects; builds menu with common actions.
 */
// TODO(burdon): Reconcile title and menu with main Card header.
export const CardSubjectMenu = ({
  subject,
  db,
  ...props
}: CardPreviewProps & Omit<IconButtonProps, 'icon' | 'label'>) => {
  const { t } = useTranslation(meta.id);
  const menuProps = useSubjectMenuGroupItems({ subject, db });

  if (!db) {
    return null;
  }

  return (
    <MenuProvider {...menuProps}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--dots-three-vertical--bold'
            iconOnly
            label={t('more options label')}
            {...props}
          />
        </DropdownMenu.Trigger>
      </DropdownMenu.Root>
    </MenuProvider>
  );
};

const useSubjectMenuGroupItems = ({ subject, db }: CardPreviewProps): MenuActions => {
  const { invokePromise } = useOperationInvoker();
  const result: ActionGraphProps = { edges: [], nodes: [] };

  result.nodes.push({
    type: Node.ActionType,
    id: `${subject.id}/open`,
    data: () => invokePromise(Common.LayoutOperation.Open, { subject: [Obj.getDXN(subject).toString()] }),
    properties: {
      label: ['open object label', { ns: meta.id }],
      icon: 'ph--arrow-right--regular',
    },
  });

  if (db && Obj.getDXN(subject).asQueueDXN()) {
    result.nodes.push({
      type: Node.ActionType,
      id: `${subject.id}/add-to-space`,
      // TODO(wittjosiah): Update reference to point to db object when adding?
      data: () =>
        invokePromise(SpaceOperation.AddObject, {
          object: subject,
          target: db,
          hidden: true,
        }),
      properties: {
        label: ['add object to space label', { ns: meta.id }],
        icon: 'ph--file-plus--regular',
      },
    });
  }

  result.nodes.forEach(({ id: target }) => {
    result.edges.push({ source: 'root', target });
  });

  return useMenuActions(Atom.make(result));
};
