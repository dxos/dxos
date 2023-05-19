//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight, Eye } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { Button, ListItemScopedProps, useId, useListItemContext, useSidebar, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { Space, SpaceState } from '@dxos/client';
import {
  Tooltip,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeItemOpenTrigger,
  TreeRoot,
} from '@dxos/react-appkit';
import { useMulticastObservable } from '@dxos/react-async';
import { useIdentity } from '@dxos/react-client';

import { getSpaceDisplayName } from '../../util';

export type HiddenSpacesTreeProps = {
  hiddenSpaces?: Space[];
};

const HiddenSpaceItem = ({ space, handleUnhideSpace }: { space: Space; handleUnhideSpace: (space: Space) => void }) => {
  const { t } = useTranslation('composer');
  const spaceSate = useMulticastObservable(space.state);
  const disabled = spaceSate !== SpaceState.READY;
  const spaceDisplayName = getSpaceDisplayName(t, space, disabled);
  const { sidebarOpen } = useSidebar();
  return (
    <TreeItem classNames='flex mis-1 mie-1.5'>
      <TreeItemHeading classNames='grow'>{spaceDisplayName}</TreeItemHeading>
      <Tooltip content={t('unhide space label')} tooltipLabelsTrigger side='top' zIndex='z-[31]'>
        <Button
          variant='ghost'
          data-testid='composer.unhideSpace'
          classNames='shrink-0 pli-1'
          onClick={() => handleUnhideSpace(space)}
          {...(!sidebarOpen && { tabIndex: -1 })}
        >
          <Eye className={getSize(4)} />
        </Button>
      </Tooltip>
    </TreeItem>
  );
};

const HiddenSpacesBranch = ({ __listItemScope, hiddenSpaces }: ListItemScopedProps<HiddenSpacesTreeProps>) => {
  const { t } = useTranslation('composer');
  const { open } = useListItemContext('HiddenSpacesBranch', __listItemScope);
  const identity = useIdentity();
  const { sidebarOpen } = useSidebar();

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  const handleUnhideSpace = useCallback(
    (space: Space) => {
      if (identity) {
        const identityHex = identity.identityKey.toHex();
        space.properties.members = {
          ...space.properties.members,
          [identityHex]: {
            ...space.properties.members?.[identityHex],
            hidden: false,
          },
        };
      }
    },
    [identity],
  );

  return (
    <>
      <div role='none' className='flex'>
        <TreeItemOpenTrigger {...(!sidebarOpen && { tabIndex: -1 })}>
          <OpenTriggerIcon />
        </TreeItemOpenTrigger>
        <TreeItemHeading classNames='grow break-words pbs-1.5 text-sm font-system-medium'>
          {t('hidden spaces tree label')}
        </TreeItemHeading>
      </div>
      <TreeItemBody className='mbs-2'>
        <TreeBranch>
          {hiddenSpaces!.map((space) => (
            <HiddenSpaceItem key={space.key.toHex()} {...{ space, handleUnhideSpace }} />
          ))}
        </TreeBranch>
      </TreeItemBody>
    </>
  );
};

export const HiddenSpacesTree = (props: HiddenSpacesTreeProps) => {
  const { t } = useTranslation('composer');
  const treeLabel = useId('hiddenSpacesTree');
  return props.hiddenSpaces?.length ? (
    <>
      <span className='sr-only' id={treeLabel}>
        {t('hidden spaces tree label')}
      </span>
      <TreeRoot aria-labelledby={treeLabel} data-testid='composer.hiddenSpaces' classNames='shrink-0'>
        <TreeItem collapsible classNames='mis-1 block'>
          <HiddenSpacesBranch {...props} />
        </TreeItem>
      </TreeRoot>
    </>
  ) : null;
};
