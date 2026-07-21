//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Card, Image, Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { Summary } from '#components';
import { meta } from '#meta';
import { type Bookmark, BookmarkOperation } from '#types';

import { useImageLoads } from '../useImageLoads';

export type BookmarkArticleProps = AppSurface.ObjectArticleProps<Bookmark.Bookmark>;

export const BookmarkArticle = ({ role, attendableId, subject }: BookmarkArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const [bookmark] = useObject(subject);
  const imageLoads = useImageLoads(bookmark.image);
  const [summarizing, setSummarizing] = useState(false);
  // Resolve the summary's target so the editor mounts once the ref loads; `.target` isn't reactive on its own.
  useObject(subject.summary);
  const summary = subject.summary?.target;

  const handleOpenSource = useCallback(() => {
    if (isExternalHttpUrl(bookmark.url)) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    }
  }, [bookmark.url]);

  const handleSummarize = useCallback(() => {
    if (!invokePromise) {
      return;
    }
    setSummarizing(true);
    void invokePromise(
      BookmarkOperation.Summarize,
      { bookmark: Ref.make(subject) },
      {
        spaceId: Obj.getDatabase(subject)?.spaceId,
        notify: { error: ['summarize-error.message', { ns: meta.profile.key }] },
      },
    ).finally(() => setSummarizing(false));
  }, [invokePromise, subject]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'summarize',
          {
            label: ['summarize.label', { ns: meta.profile.key }],
            icon: 'ph--sparkle--regular',
            disabled: summarizing || !isExternalHttpUrl(bookmark.url),
            disposition: 'toolbar',
            testId: 'bookmark.toolbar.summarize',
          },
          () => handleSummarize(),
        )
        .separator()
        .action(
          'openSource',
          {
            label: ['open-source.label', { ns: meta.profile.key }],
            icon: 'ph--arrow-square-out--regular',
            disabled: !isExternalHttpUrl(bookmark.url),
            disposition: 'toolbar',
            testId: 'bookmark.toolbar.open-source',
          },
          () => handleOpenSource(),
        )
        .build(),
    [bookmark.url, summarizing, handleOpenSource, handleSummarize],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild classNames='dx-container'>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-container flex flex-col'>
          <div className='flex justify-center'>
            <div className='dx-document py-3'>
              <Card.Root fullWidth border={false}>
                <Card.Header>
                  <Card.Block>
                    <img src={bookmark.favicon} alt={bookmark.title} />
                  </Card.Block>
                  <Card.Title>{bookmark.title}</Card.Title>
                </Card.Header>
                <Card.Body>
                  <Card.Section>
                    <Card.Text onClick={handleOpenSource} classNames='dx-link font-mono text-sm'>
                      {bookmark.url}
                    </Card.Text>
                    <Card.Text>{bookmark.excerpt}</Card.Text>
                    {bookmark.image && imageLoads && (
                      <Image classNames='my-2' alt={bookmark.title} src={bookmark.image} />
                    )}
                  </Card.Section>
                </Card.Body>
              </Card.Root>
            </div>
          </div>
          {summary && <Summary id={`${Obj.getURI(subject)}/summary`} source={subject.summary} />}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

const isExternalHttpUrl = (value?: string): boolean => {
  try {
    const { protocol } = new URL(value ?? '');
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
};

BookmarkArticle.displayName = 'BookmarkArticle';
