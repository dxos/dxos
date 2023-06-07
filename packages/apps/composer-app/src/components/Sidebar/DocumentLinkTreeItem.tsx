//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Circle, DotsThreeVertical, FileMinus } from '@phosphor-icons/react';
import React, { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import {
  useTranslation,
  ListItem,
  useSidebar,
  useDensityContext,
  Tooltip,
  Button,
  TreeItem,
  DropdownMenu,
  useMediaQuery,
} from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx, appTx } from '@dxos/aurora-theme';
import { observer, Space } from '@dxos/react-client';

import { getPath } from '../../router';

export const DocumentLinkTreeItem = observer(
  ({ document, space, linkTo }: { document: Document; space: Space; linkTo: string }) => {
    const { sidebarOpen, closeSidebar } = useSidebar();
    const { t } = useTranslation('composer');
    const { docKey } = useParams();
    const density = useDensityContext();
    const navigate = useNavigate();
    const [isLg] = useMediaQuery('lg', { ssr: false });

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
      <TreeItem.Root classNames='pis-7 pointer-fine:pis-6 pointer-fine:pie-0 flex'>
        <TreeItem.Heading
          asChild
          classNames={appTx(
            'button.root',
            'tree-item__heading--link',
            { variant: 'ghost', density },
            'grow text-base p-0 font-normal flex items-start gap-1 pointer-fine:min-height-6',
          )}
        >
          <Link
            to={linkTo}
            data-testid='composer.documentTreeItem.Heading'
            {...(!sidebarOpen && { tabIndex: -1 })}
            onClick={() => !isLg && closeSidebar()}
          >
            <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
            <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
          </Link>
        </TreeItem.Heading>
        <Tooltip.Root
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
          <Tooltip.Portal>
            <Tooltip.Content classNames='z-[31]' side='bottom'>
              {t('document options label')}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
          <DropdownMenu.Root
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
            <DropdownMenu.Trigger asChild>
              <Tooltip.Trigger asChild>
                <Button
                  variant='ghost'
                  data-testid='composer.openSpaceMenu'
                  classNames='shrink-0 pli-2 pointer-fine:pli-1 self-start'
                  {...(!sidebarOpen && { tabIndex: -1 })}
                >
                  <DotsThreeVertical className={getSize(4)} />
                </Button>
              </Tooltip.Trigger>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content classNames='z-[31]'>
                <DropdownMenu.Item onClick={handleDelete} classNames='gap-2'>
                  <FileMinus className={getSize(4)} />
                  <span>{t('delete document label')}</span>
                </DropdownMenu.Item>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </Tooltip.Root>
        <ListItem.Endcap classNames='is-8 pointer-fine:is-6 flex items-center'>
          <Circle
            weight='fill'
            className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
          />
        </ListItem.Endcap>
      </TreeItem.Root>
    );
  },
);
