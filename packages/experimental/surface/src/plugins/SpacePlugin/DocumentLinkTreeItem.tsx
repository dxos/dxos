//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Circle } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { useTranslation, ListItem, useSidebar, useDensityContext, TreeItem, useMediaQuery } from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx, appTx } from '@dxos/aurora-theme';
import { observer } from '@dxos/react-client';

import { GraphNode } from '../GraphPlugin';
import { useTreeView } from '../TreeViewPlugin';

export const DocumentLinkTreeItem = observer(({ data: item }: { data: GraphNode<Document> }) => {
  const document = item.data!;
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { t } = useTranslation('composer');
  const density = useDensityContext();
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { selected, setSelected } = useTreeView();

  const active = document.id === selected?.data?.id;
  const Icon = document.content?.kind === TextKind.PLAIN ? ArticleMedium : Article;

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
        <button
          {...(!sidebarOpen && { tabIndex: -1 })}
          onClick={() => {
            setSelected(item);
            !isLg && closeSidebar();
          }}
          className='text-start flex gap-2'
        >
          <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
          <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
        </button>
      </TreeItem.Heading>
      <ListItem.Endcap classNames='is-8 pointer-fine:is-6 flex items-center'>
        <Circle
          weight='fill'
          className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
        />
      </ListItem.Endcap>
    </TreeItem.Root>
  );
});
