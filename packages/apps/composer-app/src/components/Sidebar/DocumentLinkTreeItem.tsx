//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Circle } from '@phosphor-icons/react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { useTranslation, ListItemEndcap, useSidebar, useDensityContext } from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx, appTx } from '@dxos/aurora-theme';
import { TreeItem, TreeItemHeading } from '@dxos/react-appkit';
import { observer } from '@dxos/react-client';

export const DocumentLinkTreeItem = observer(({ document, linkTo }: { document: Document; linkTo: string }) => {
  const { sidebarOpen } = useSidebar();
  const { t } = useTranslation('composer');
  const { docKey } = useParams();
  const density = useDensityContext();
  const active = docKey === document.id;
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem classNames='pis-7 pointer-fine:pis-6 pie-1 pointer-fine:pie-0'>
      <TreeItemHeading
        asChild
        classNames={appTx(
          'button.root',
          'tree-item__heading--link',
          { variant: 'ghost', density },
          'is-full text-base p-0 font-normal items-start gap-1 pointer-fine:min-height-6',
        )}
      >
        <Link to={linkTo} data-testid='composer.documentTreeItemHeading' {...(!sidebarOpen && { tabIndex: -1 })}>
          <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
          <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
          <ListItemEndcap classNames='is-6 flex items-center'>
            <Circle
              weight='fill'
              className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
            />
          </ListItemEndcap>
        </Link>
      </TreeItemHeading>
    </TreeItem>
  );
});
