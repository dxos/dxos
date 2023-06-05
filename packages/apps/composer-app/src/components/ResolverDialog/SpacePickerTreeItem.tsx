//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight } from '@phosphor-icons/react';
import React, { useMemo, useState } from 'react';

import { Document } from '@braneframe/types';
import {
  Button,
  Tag,
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
  TreeBranch,
  TreeItem,
  TreeItemBody,
  TreeItemHeading,
  TreeItemOpenTrigger,
  useTranslation,
} from '@dxos/aurora';
import { defaultDisabled } from '@dxos/aurora-theme';
import { Space, SpaceState } from '@dxos/client';
import { useMulticastObservable } from '@dxos/react-async';
import { observer, useQuery } from '@dxos/react-client';

import { bindSpace, getSpaceDisplayName, matchSpace } from '../../util';
import { DocumentTreeItem } from './DocumentTreeItem';
import { ResolverProps } from './ResolverProps';

export const SpacePickerTreeItem = observer(
  ({
    identityHex,
    space,
    source,
    id,
    setSpace,
  }: Pick<ResolverProps, 'setSpace'> & { identityHex: string; space: Space; source: string; id: string }) => {
    const { t } = useTranslation('composer');
    const spaceSate = useMulticastObservable(space.state);
    const disabled = spaceSate !== SpaceState.READY;
    const spaceDisplayName = getSpaceDisplayName(t, space, disabled);
    const documents = useQuery(space, Document.filter());
    const hasDocuments = documents.length > 0;

    const [open, setOpen] = useState(false);

    const nBoundMembers = useMemo(() => {
      return Object.keys(space.properties.members ?? {}).filter((identityHex) =>
        matchSpace(space, identityHex, source, id),
      ).length;
    }, [source, id, space.properties]);

    const OpenTriggerIcon = open ? CaretDown : CaretRight;

    return (
      <TreeItem
        collapsible
        open={open}
        onOpenChange={setOpen}
        classNames={['mbe-2 block', disabled && defaultDisabled]}
        {...(disabled && { 'aria-disabled': true })}
      >
        <div role='none' className='flex items-center gap-2'>
          {hasDocuments ? (
            <TreeItemOpenTrigger>
              <OpenTriggerIcon />
            </TreeItemOpenTrigger>
          ) : (
            <TreeItemOpenTrigger disabled classNames={defaultDisabled}>
              <CaretRight />
            </TreeItemOpenTrigger>
          )}
          <TreeItemHeading
            classNames='grow break-words pbs-1 text-base font-medium'
            data-testid='composer.spaceTreeItemHeading'
          >
            {spaceDisplayName}
          </TreeItemHeading>
          {nBoundMembers > 0 && (
            <TooltipRoot>
              <TooltipTrigger asChild>
                <Tag palette='info' aria-label={t('bound members message', { count: nBoundMembers })}>
                  {nBoundMembers}
                </Tag>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side='bottom'>
                  <TooltipArrow />
                  {t('bound members message', { count: nBoundMembers })}
                </TooltipContent>
              </TooltipPortal>
            </TooltipRoot>
          )}
          <Button
            density='fine'
            classNames='shrink-0'
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
  },
);
