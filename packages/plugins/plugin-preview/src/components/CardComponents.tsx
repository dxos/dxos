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
import { Card } from '@dxos/react-ui-mosaic';

import { meta } from '../meta';
import { type CardPreviewProps } from '../types';

export const gridRow = 'is-full grid grid-cols-[1.5rem_1fr_min-content] gap-2 items-center';

/** @deprecated */
export const CardHeader = ({ label, subject, db }: { label?: string } & CardPreviewProps) => {
  return (
    <div role='none' className='flex items-center gap-2'>
      <Card.Heading>{label}</Card.Heading>
      <CardSubjectMenu db={db} subject={subject} />
    </div>
  );
};

/** @deprecated */
export const CardSubjectMenu = ({
  subject,
  db,
  ...props
}: CardPreviewProps & Omit<IconButtonProps, 'icon' | 'label'>) => {
  const { t } = useTranslation(meta.id);
  const menuProps = useSubjectMenuGroupItems({ subject, db });

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
