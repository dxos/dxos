//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Circle } from '@phosphor-icons/react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';

import { Document } from '@braneframe/types';
import { useTranslation, ListItemEndcap } from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx, appTx } from '@dxos/aurora-theme';
import { TreeItem, TreeItemHeading } from '@dxos/react-appkit';
import { observer } from '@dxos/react-client';

export const DocumentLinkTreeItem = observer(({ document, linkTo }: { document: Document; linkTo: string }) => {
  const { t } = useTranslation('composer');
  const { docKey } = useParams();
  const active = docKey === document.id;
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem className='pis-4'>
      <TreeItemHeading asChild>
        <Link
          to={linkTo}
          className={appTx(
            'button.root',
            'tree-item__heading--link',
            { variant: 'ghost' },
            'is-full text-base p-0 font-normal items-start gap-1'
          )}
          data-testid='composer.documentTreeItemHeading'
        >
          <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
          <p className='grow mbs-1'>{document.title || t('untitled document title')}</p>
          <ListItemEndcap className='is-6 flex items-center'>
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
