//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Circle } from '@phosphor-icons/react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';

import { observer } from '@dxos/react-client';
import {
  buttonStyles,
  getSize,
  ListItemEndcap,
  mx,
  TreeItem,
  TreeItemHeading,
  useTranslation
} from '@dxos/react-components';
import { TextKind } from '@dxos/react-composer';

import { ComposerDocument } from '../../proto';

export const DocumentTreeItem = observer(({ document, linkTo }: { document: ComposerDocument; linkTo: string }) => {
  const { t } = useTranslation('composer');
  const { docKey } = useParams();
  const active = docKey === document.id;
  const Icon = document.content.kind === TextKind.PLAIN ? ArticleMedium : Article;
  return (
    <TreeItem>
      <TreeItemHeading asChild>
        <Link
          to={linkTo}
          className={mx(buttonStyles({ variant: 'ghost' }), 'is-full text-base p-0 font-normal items-start gap-1')}
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
