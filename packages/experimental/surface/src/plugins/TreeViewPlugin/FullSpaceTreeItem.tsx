//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import React, { PropsWithChildren, useEffect, useState } from 'react';

import { useSidebar, useTranslation, TreeItem } from '@dxos/aurora';
import { defaultDisabled } from '@dxos/aurora-theme';
import { SpaceState } from '@dxos/client';
import { useMulticastObservable } from '@dxos/react-async';
import { Space } from '@dxos/react-client';

import { getSpaceDisplayName } from '../SpacePlugin';

export const FullSpaceTreeItem = ({ space, children }: PropsWithChildren<{ space: Space }>) => {
  const { t } = useTranslation('composer');
  const hasActiveDocument = false;
  const spaceSate = useMulticastObservable(space.state);
  const disabled = spaceSate !== SpaceState.READY;
  const error = spaceSate === SpaceState.ERROR;
  const { sidebarOpen } = useSidebar();

  const [open, setOpen] = useState(false /* todo(thure): Open if document within is selected */);

  useEffect(() => {
    // todo(thure): Open if document within is selected
  }, []);

  const spaceDisplayName = getSpaceDisplayName(t, space, disabled);

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return (
    <TreeItem.Root
      collapsible
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames={['mbe-1', disabled && defaultDisabled]}
      {...(disabled && { 'aria-disabled': true })}
    >
      <div role='none' className='flex mis-1 items-start'>
        <TreeItem.OpenTrigger disabled={disabled} {...(!sidebarOpen && { tabIndex: -1 })}>
          <OpenTriggerIcon
            {...(hasActiveDocument && !open
              ? { weight: 'fill', className: 'text-primary-500 dark:text-primary-300' }
              : {})}
          />
        </TreeItem.OpenTrigger>
        <TreeItem.Heading
          classNames={[
            'grow break-words pis-1 pbs-2.5 pointer-fine:pbs-1.5 text-sm font-medium',
            error && 'text-error-700 dark:text-error-300',
            !disabled && 'cursor-pointer',
          ]}
          onClick={() => setOpen(!open)}
        >
          {spaceDisplayName}
        </TreeItem.Heading>
      </div>
      <TreeItem.Body>{children}</TreeItem.Body>
    </TreeItem.Root>
  );
};
