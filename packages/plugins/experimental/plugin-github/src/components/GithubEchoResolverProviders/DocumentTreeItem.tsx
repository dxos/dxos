//
// Copyright 2023 DXOS.org
//

import { TextAa } from '@phosphor-icons/react';
import React from 'react';

import { type DocumentType } from '@dxos/plugin-markdown/types';
import { useTranslation, TreeItem } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { GITHUB_PLUGIN } from '../../meta';

export const DocumentTreeItem = ({ document }: { document: DocumentType }) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  return (
    <TreeItem.Root classNames='flex gap-2'>
      <TreeItem.Heading classNames='contents'>
        <TextAa weight='regular' className={mx(getSize(4), 'mbs-2 shrink-0')} />
        <span className='mbs-2 no-leading grow text-sm'>
          {document.name || t('document title placeholder', { ns: 'dxos.org/plugin/markdown' })}
        </span>
      </TreeItem.Heading>
    </TreeItem.Root>
  );
};
