//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { Document } from '@braneframe/types';
import { Button, MockListItemOpenTrigger, useTranslation } from '@dxos/aurora';
import { defaultDisabled } from '@dxos/aurora-theme';
import { Space, SpaceState } from '@dxos/client';
import { TreeBranch, TreeItem, TreeItemBody, TreeItemHeading, TreeItemOpenTrigger } from '@dxos/react-appkit';
import { useMulticastObservable } from '@dxos/react-async';
import { useQuery } from '@dxos/react-client';

import { bindSpace, getSpaceDisplayName } from '../../util';
import { DocumentTreeItem } from './DocumentTreeItem';
import { ResolverProps } from './ResolverProps';

export const SpacePickerTreeItem = ({
  identityHex,
  space,
  source,
  id,
  setSpace
}: Pick<ResolverProps, 'setSpace'> & { identityHex: string; space: Space; source: string; id: string }) => {
  const { t } = useTranslation('composer');
  const spaceSate = useMulticastObservable(space.state);
  const disabled = spaceSate !== SpaceState.READY;
  const spaceDisplayName = getSpaceDisplayName(t, space, disabled);
  const documents = useQuery(space, Document.filter());
  const hasDocuments = documents.length > 0;

  const [open, setOpen] = useState(false);

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return (
    <TreeItem
      collapsible
      open={open}
      onOpenChange={setOpen}
      className={['mbe-2 block', disabled && defaultDisabled]}
      {...(disabled && { 'aria-disabled': true })}
    >
      <div role='none' className='flex items-center gap-1'>
        {hasDocuments ? (
          <TreeItemOpenTrigger>
            <OpenTriggerIcon />
          </TreeItemOpenTrigger>
        ) : (
          <MockListItemOpenTrigger />
        )}
        <TreeItemHeading
          className='grow break-words pbs-1 text-base font-medium'
          data-testid='composer.spaceTreeItemHeading'
        >
          {spaceDisplayName}
        </TreeItemHeading>
        <Button
          density='fine'
          className='shrink-0'
          onClick={() => {
            if (identityHex) {
              bindSpace(space, identityHex, source, id);
              setSpace(space);
            }
          }}
        >
          Select
        </Button>
      </div>
      <TreeItemBody>
        {hasDocuments && (
          <TreeBranch>
            {documents.map((document) => (
              <DocumentTreeItem key={document.id} document={document} />
            ))}
          </TreeBranch>
        )}
      </TreeItemBody>
    </TreeItem>
  );
};
