//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { useTranslation, TreeItem } from '@dxos/aurora';
import { TextKind } from '@dxos/aurora-composer';
import { getSize, mx } from '@dxos/aurora-theme';

export const DocumentTreeItem = ({ document }: { document: Document }) => {
  const { t } = useTranslation('composer');
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem.Root classNames='flex gap-2'>
      <TreeItem.Heading classNames='contents'>
        <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
        <span className='grow mbs-2 text-sm no-leading'>{document.title || t('untitled document title')}</span>
      </TreeItem.Heading>
    </TreeItem.Root>
  );
};
