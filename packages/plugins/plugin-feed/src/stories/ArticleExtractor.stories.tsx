//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { IconButton, Input, Panel, ScrollArea, Select, Toolbar } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { composable } from '@dxos/ui-theme';

import { translations } from '#translations';

import { PostContent } from '../components';
import { Subscription } from '../types';
import { type ExtractedArticle, extractArticle } from '../util';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; article: ExtractedArticle; sourceLength: number }
  | { status: 'error'; message: string };

const SAMPLE_URLS = [
  'https://www.inkandswitch.com/essay/local-first/',
  'https://martinfowler.com/articles/cant-buy-integration.html',
  'https://overreacted.io/before-you-memo/',
  'https://www.theregister.com/2026/04/24/deepseek_v4/',
];

const formatBytes = (n: number): string => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

const DefaultStory = () => {
  const [url, setUrl] = useState(SAMPLE_URLS[0]);
  const [state, setState] = useState<State>({ status: 'idle' });
  const [showMarkdown, setShowMarkdown] = useState(false);

  const handleFetch = useCallback(async () => {
    if (!url) {
      return;
    }
    setState({ status: 'loading' });
    try {
      // Storybook ships the same `/api/rss?url=` middleware as composer-app for CORS-free fetches.
      const proxyUrl = `/api/rss?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      const article = await extractArticle(html, url);
      setState({ status: 'ok', article, sourceLength: html.length });
    } catch (error) {
      setState({ status: 'error', message: String(error) });
    }
  }, [url]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              placeholder='Article URL'
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleFetch();
                }
              }}
              classNames='is-full min-is-[24rem]'
            />
          </Input.Root>
          <Select.Root
            value={url}
            onValueChange={(sample) => {
              setUrl(sample);
              setState({ status: 'idle' });
            }}
          >
            <Toolbar.Button asChild>
              <Select.TriggerButton placeholder='Sample URL' />
            </Toolbar.Button>
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {SAMPLE_URLS.map((sample) => (
                    <Select.Option key={sample} value={sample}>
                      {new URL(sample).hostname}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Toolbar.IconButton
            icon='ph--arrow-clockwise--regular'
            iconOnly
            label='Fetch'
            onClick={() => void handleFetch()}
            disabled={state.status === 'loading'}
          />
          <IconButton
            label={showMarkdown ? 'Show preview' : 'Show Markdown'}
            icon={showMarkdown ? 'ph--article--regular' : 'ph--code--regular'}
            iconOnly
            aria-pressed={showMarkdown}
            onClick={() => setShowMarkdown((showMarkdown) => !showMarkdown)}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        {state.status === 'ok' ? (
          <ResultView article={state.article} sourceLength={state.sourceLength} showMarkdown={showMarkdown} />
        ) : (
          <div>
            {state.status === 'idle' && (
              <p className='p-2 text-sm text-subdued'>Paste an article URL and press Fetch to see the extraction.</p>
            )}
            {state.status === 'loading' && <p className='p-2 text-sm text-subdued'>Fetching and extracting…</p>}
            {state.status === 'error' && (
              <pre className='p-2 text-sm text-error whitespace-pre-wrap break-all'>{state.message}</pre>
            )}
          </div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

type ResultViewProps = {
  article: ExtractedArticle;
  sourceLength: number;
  showMarkdown: boolean;
};

const ResultView = composable<HTMLDivElement, ResultViewProps>(
  ({ article, sourceLength, showMarkdown, ...props }, forwardedRef) => {
    const post = useMemo(
      () =>
        Subscription.makePost({
          title: article.title,
          author: article.author,
          published: article.published,
          description: article.description,
          imageUrl: article.image,
          content: article.markdown,
        }),
      [article],
    );

    const metadata = [
      article.domain,
      article.wordCount && `${article.wordCount.toLocaleString()} words`,
      `source ${formatBytes(sourceLength)}`,
      `${article.imageUrls.length} images`,
    ].filter((value): value is string => Boolean(value));

    if (showMarkdown) {
      return (
        <ScrollArea.Root {...props} orientation='vertical' thin ref={forwardedRef}>
          <ScrollArea.Viewport>
            <SyntaxHighlighter language='markdown' classNames='m-4'>
              {post.content}
            </SyntaxHighlighter>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      );
    }

    return <PostContent {...props} ref={forwardedRef} post={post} metadata={metadata} />;
  },
);

ResultView.displayName = 'ResultView';

const meta = {
  title: 'plugins/plugin-feed/stories/ArticleExtractor',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Live preview of the defuddle-based article extractor.
 *
 * Paste a URL → the storybook-react vite middleware proxies the fetch via
 * `/api/rss?url=` to bypass browser CORS → the HTML is run through
 * `extractArticle` → the result is rendered with `MarkdownViewer`.
 */
export const Default: Story = {};
