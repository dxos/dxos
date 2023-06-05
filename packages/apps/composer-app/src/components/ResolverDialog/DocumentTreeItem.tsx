//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { useTranslation, TreeItem, TreeItemHeading } from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx } from '@dxos/aurora-theme';
import { observer } from '@dxos/react-client';

export const DocumentTreeItem = observer(({ document }: { document: Document }) => {
  const { t } = useTranslation('composer');
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem classNames='flex gap-2'>
      <TreeItemHeading classNames='contents'>
        <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
        <span className='grow mbs-2 text-sm no-leading'>{document.title || t('untitled document title')}</span>
      </TreeItemHeading>
    </TreeItem>
  );
});
