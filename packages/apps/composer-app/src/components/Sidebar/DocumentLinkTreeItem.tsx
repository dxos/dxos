//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Circle, DotsThreeVertical, FileMinus } from '@phosphor-icons/react';
import React, { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import {
  useTranslation,
  ListItemEndcap,
  useSidebar,
  useDensityContext,
  TooltipTrigger,
  Button,
  TooltipRoot,
  TreeItem,
  TreeItemHeading,
  DropdownMenuRoot,
  DropdownMenuArrow,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuContent,
  TooltipContent,
  TooltipArrow,
  TooltipPortal,
  DropdownMenuPortal,
} from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx, appTx } from '@dxos/aurora-theme';
import { observer, Space } from '@dxos/react-client';

import { getPath } from '../../router';

export const DocumentLinkTreeItem = observer(
  ({ document, space, linkTo }: { document: Document; space: Space; linkTo: string }) => {
    const { sidebarOpen } = useSidebar();
    const { t } = useTranslation('composer');
    const { docKey } = useParams();
    const density = useDensityContext();
    const navigate = useNavigate();
    const active = docKey === document.id;
    const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;

    const suppressNextTooltip = useRef<boolean>(false);
    const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
    const [optionsMenuOpen, setOpetionsMenuOpen] = useState(false);

    const handleDelete = useCallback(() => {
      if (active) {
        navigate(getPath(space.key));
      }
      space.db.remove(document);
    }, [space, document]);

    return (
      <TreeItem classNames='pis-7 pointer-fine:pis-6 pie-1 pointer-fine:pie-0 flex'>
        <TreeItemHeading
          asChild
          classNames={appTx(
            'button.root',
            'tree-item__heading--link',
            { variant: 'ghost', density },
            'grow text-base p-0 font-normal flex items-start gap-1 pointer-fine:min-height-6',
          )}
        >
          <Link to={linkTo} data-testid='composer.documentTreeItemHeading' {...(!sidebarOpen && { tabIndex: -1 })}>
            <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
            <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
          </Link>
        </TreeItemHeading>
        <TooltipRoot
          open={optionsTooltipOpen}
          onOpenChange={(nextOpen) => {
            if (suppressNextTooltip.current) {
              setOptionsTooltipOpen(false);
              suppressNextTooltip.current = false;
            } else {
              setOptionsTooltipOpen(nextOpen);
            }
          }}
        >
          <TooltipPortal>
            <TooltipContent classNames='z-[31]' side='bottom'>
              {t('document options label')}
              <TooltipArrow />
            </TooltipContent>
          </TooltipPortal>
          <DropdownMenuRoot
            {...{
              open: optionsMenuOpen,
              onOpenChange: (nextOpen: boolean) => {
                if (!nextOpen) {
                  suppressNextTooltip.current = true;
                }
                return setOpetionsMenuOpen(nextOpen);
              },
            }}
          >
            <DropdownMenuTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  data-testid='composer.openSpaceMenu'
                  classNames='shrink-0 pli-2 pointer-fine:pli-1'
                  {...(!sidebarOpen && { tabIndex: -1 })}
                >
                  <DotsThreeVertical className={getSize(4)} />
                </Button>
              </TooltipTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent classNames='z-[31]'>
                <DropdownMenuItem onClick={handleDelete} classNames='gap-2'>
                  <FileMinus className={getSize(4)} />
                  <span>{t('delete document label')}</span>
                </DropdownMenuItem>
                <DropdownMenuArrow />
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </TooltipRoot>
        <ListItemEndcap classNames='is-6 flex items-center'>
          <Circle
            weight='fill'
            className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
          />
        </ListItemEndcap>
      </TreeItem>
    );
  },
);
