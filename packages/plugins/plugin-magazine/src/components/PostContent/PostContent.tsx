//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { ScrollArea } from '@dxos/react-ui';
import { composable } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';

import { usePostContentAtom } from '#atoms';
import { Subscription } from '#types';

import { formatDate, getImageUrl } from '../../util/index.ts';
import { contentHasImage, dedupeImagesInMarkdown } from './dedupe-images.ts';

export type PostContentProps = {
  /** Post to render. */
  post: Subscription.Post;
  /** Additional metadata, such as feed or source domain, rendered between author and published date. */
  metadata?: string[];
};

/**
 * Shared presentational layout for an article-style post.
 * Render order: title → hero image → Markdown body (subscription contentFeed
 * entry for this Post id, falling back to `post.description`) → meta line
 * (author · …extra · published).
 */
export const PostContent = composable<HTMLDivElement, PostContentProps>(
  ({ post, metadata = [], ...props }, forwardedRef) => {
    const meta = [post.author, ...metadata, formatDate(post.published)].filter(Boolean).join(' · ');
    const title = post.title;
    const postContent = usePostContentAtom(post);
    const imageUrl = getImageUrl(post, postContent);
    const fetchedText = postContent?.text;

    // Drop duplicate images from the article body — and remove any image
    // that matches the hero `imageUrl` so it doesn't appear stacked immediately
    // below the hero. Falls through to `post.description` when content
    // hasn't been fetched yet.
    const content = useMemo(() => {
      const source = fetchedText || post.description || '';
      if (!source) {
        return '';
      }
      return dedupeImagesInMarkdown(source, [imageUrl]);
    }, [fetchedText, post.description, imageUrl]);

    // Suppress the hero when the article body already carries imagery — RSS feeds often
    // duplicate the lead image inside `<content>` under a different URL than `imageUrl`,
    // and rendering both stacks the same picture twice (see e.g. Guardian galleries).
    const showHero = useMemo(
      () => Boolean(imageUrl?.startsWith('http')) && !contentHasImage(content),
      [imageUrl, content],
    );

    return (
      <ScrollArea.Root {...props} orientation='vertical' thin ref={forwardedRef}>
        <ScrollArea.Viewport classNames='flex flex-col gap-3 p-4'>
          {title && <h1 className='text-xl font-semibold'>{title}</h1>}
          {showHero && <img src={imageUrl} alt='' className='rounded w-full object-cover max-h-72' loading='lazy' />}
          {content && <MarkdownView content={content} />}
          {meta && <div className='text-xs text-subdued'>{meta}</div>}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

PostContent.displayName = 'PostContent';
