//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium } from '@phosphor-icons/react';
import React from 'react';

import { type Document } from '@braneframe/types';
import { useTranslation, TreeItem } from '@dxos/react-ui';
import { TextKind } from '@dxos/react-ui-editor';
import { getSize, mx } from '@dxos/react-ui-theme';

import { GITHUB_PLUGIN } from '../../meta';

export const DocumentTreeItem = ({ document }: { document: Document }) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem.Root classNames='flex gap-2'>
      <TreeItem.Heading classNames='contents'>
        <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
        <span className='grow mbs-2 text-sm no-leading'>
          {document.title || t('document title placeholder', { ns: 'dxos.org/plugin/markdown' })}
        </span>
      </TreeItem.Heading>
    </TreeItem.Root>
  );
};
