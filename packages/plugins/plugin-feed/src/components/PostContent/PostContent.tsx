//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { MarkdownViewer } from '@dxos/react-ui-markdown';
import { composable } from '@dxos/ui-theme';

import { Subscription } from '#types';

import { formatDate } from '../../util/format-date';

export type PostContentProps = {
  /** Post to render. */
  post: Subscription.Post;
  /** Additional metadata, such as feed or source domain, rendered between author and published date. */
  metadata?: string[];
};

/**
 * Strips images from a markdown string whose URL is already on the
 * `excluded` list, AND drops any image that appears more than once. The
 * hero `post.imageUrl` is added to `excluded` by the caller so the
 * extracted article body doesn't re-render the same image immediately
 * below the hero. Captures both Markdown image syntax (`![alt](url
 * "title")`) and inline HTML `<img>` tags that defuddle sometimes
 * leaves behind.
 */
export const dedupeImagesInMarkdown = (markdown: string, excluded: ReadonlyArray<string | undefined>): string => {
  const seen = new Set<string>();
  for (const url of excluded) {
    if (url) {
      seen.add(url);
    }
  }

  // Markdown image: `![alt](url)` or `![alt](url "title")`.
  const markdownImg = /!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  // HTML image: `<img ... src="url" ...>`.
  const htmlImg = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

  const dedupe = (input: string, regex: RegExp): string =>
    input.replace(regex, (match, url) => {
      if (typeof url !== 'string') {
        return match;
      }
      if (seen.has(url)) {
        return '';
      }
      seen.add(url);
      return match;
    });

  return dedupe(dedupe(markdown, markdownImg), htmlImg);
};

/**
 * Shared presentational layout for an article-style post.
 * Render order: title → hero image → Markdown body (`post.content` /
 * `post.snippet`) → meta line (author · …extra · published).
 */
export const PostContent = composable<HTMLDivElement, PostContentProps>(
  ({ post, metadata = [], ...props }, forwardedRef) => {
    const meta = [post.author, ...metadata, formatDate(post.published)].filter(Boolean).join(' · ');
    const title = post.title;

    // Drop duplicate images from the article body — and remove any image
    // that matches the hero `post.imageUrl` so it doesn't appear stacked
    // immediately below the hero. Falls through to `post.snippet` when
    // `post.content` is unset.
    const content = useMemo(() => {
      const source = post.content || post.snippet || '';
      if (!source) {
        return '';
      }
      return dedupeImagesInMarkdown(source, [post.imageUrl]);
    }, [post.content, post.snippet, post.imageUrl]);

    return (
      <ScrollArea.Root {...props} orientation='vertical' thin ref={forwardedRef}>
        <ScrollArea.Viewport classNames='flex flex-col gap-3 p-4'>
          {title && <h1 className='text-xl font-semibold'>{title}</h1>}
          {post.imageUrl?.startsWith('http') && (
            <img src={post.imageUrl} alt='' className='rounded w-full object-cover max-h-72' loading='lazy' />
          )}
          {content && <MarkdownViewer content={content} />}
          {meta && <div className='text-xs text-subdued'>{meta}</div>}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

PostContent.displayName = 'PostContent';
