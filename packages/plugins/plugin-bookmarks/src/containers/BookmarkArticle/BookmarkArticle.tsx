//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import * as Media from '@dxos/react-ui/Media';
import * as Panel from '@dxos/react-ui/Panel';

import { Summary } from '#components';
import { meta } from '#meta';
import { Bookmark, BookmarkOperation } from '#types';

import { useImageLoads } from '../useImageLoads.ts';

export type BookmarkArticleProps = AppSurface.ObjectArticleProps<Bookmark.Bookmark>;

export const BookmarkArticle = ({ role, attendableId, subject }: BookmarkArticleProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
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
    <Panel.Root role={role}>
      <Panel.Header classNames='dx-expand'>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body classNames='flex flex-col'>
        <Layout.Flex justify='center'>
          <div className='dx-document py-3'>
            <Card.Root border={false}>
              <Card.Header>
                <Layout.Block>
                  <img src={bookmark.favicon} alt={bookmark.title} />
                </Layout.Block>
                <Card.Title>{bookmark.title}</Card.Title>
              </Card.Header>
              <Card.Body>
                <Card.Section>
                  <Card.Text onClick={handleOpenSource} classNames='dx-link-accent font-mono text-sm'>
                    {bookmark.url}
                  </Card.Text>
                  <Card.Text>{bookmark.excerpt}</Card.Text>
                  {bookmark.image && imageLoads && (
                    <Media.Image classNames='my-2' alt={bookmark.title} src={bookmark.image} />
                  )}
                </Card.Section>
              </Card.Body>
            </Card.Root>
          </div>
        </Layout.Flex>
        {summary && <Summary id={`${Obj.getURI(subject)}/summary`} source={subject.summary} />}
      </Panel.Body>
    </Panel.Root>
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
