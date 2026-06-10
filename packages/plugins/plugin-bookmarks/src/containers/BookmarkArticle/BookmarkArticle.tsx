//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/react-client/echo';
import { IconButton, Image, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Bookmark } from '#types';

export type BookmarkArticleProps = AppSurface.ObjectArticleProps<Bookmark.Bookmark>;

export const BookmarkArticle = ({ role, subject }: BookmarkArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [bookmark] = useObject(subject);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon='ph--arrow-square-out--regular'
            label={t('open-source.button')}
            onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <ScrollArea.Root centered>
          <ScrollArea.Viewport>
            {bookmark.image && (
              <Image className='max-h-64 object-cover rounded-sm' src={bookmark.image} alt={bookmark.title} />
            )}
            <h1 className='text-xl'>{bookmark.title}</h1>
            {bookmark.excerpt && <p className='text-description'>{bookmark.excerpt}</p>}
            {bookmark.summary && <p>{bookmark.summary}</p>}
            {/* <pre>{JSON.stringify(bookmark, null, 2)}</pre> */}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

export default BookmarkArticle;
