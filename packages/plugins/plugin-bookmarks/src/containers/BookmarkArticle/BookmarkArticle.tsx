//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/react-client/echo';
import { Column, IconButton, Image, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Bookmark } from '#types';

import { useImageLoads } from '../useImageLoads';

export type BookmarkArticleProps = AppSurface.ObjectArticleProps<Bookmark.Bookmark>;

export const BookmarkArticle = ({ role, subject }: BookmarkArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [bookmark] = useObject(subject);
  const imageLoads = useImageLoads(bookmark.image);

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
          <ScrollArea.Viewport classNames='flex flex-col gap-2'>
            <Column.Root>
              <Column.Row>
                {(bookmark.favicon && <img src={bookmark.favicon} alt={bookmark.title} />) || <div />}
                <h1 className='text-xl'>{bookmark.title}</h1>
              </Column.Row>
              <Column.Center>
                <pre className='text-sm text-subdued'>{bookmark.url}</pre>
                {bookmark.excerpt && <p className='text-description'>{bookmark.excerpt}</p>}
                {bookmark.image && imageLoads && <Image src={bookmark.image} alt={bookmark.title} />}
                {bookmark.summary && <p>{bookmark.summary}</p>}
              </Column.Center>
            </Column.Root>
            {/* <pre>{JSON.stringify(bookmark, null, 2)}</pre> */}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
