//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MediaPlayer, type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

export type MarkdownViewProps = ThemedClassName<
  PropsWithChildren<{
    content?: string;
    components?: ReactMarkdownOptions['components'];
  }>
>;

/**
 * Transforms markdown text into react elements.
 * https://github.com/remarkjs/react-markdown
 * markdown -> remark -> [mdast -> remark plugins] -> [hast -> rehype plugins] -> components -> react elements.
 * Consider using @dxos/react-ui-editor.
 */
export const MarkdownView = ({ classNames, children, components, content = '' }: MarkdownViewProps) => {
  return (
    <div className={mx(classNames)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ ...defaultComponents, ...components }}>
        {content}
      </ReactMarkdown>
      {children}
    </div>
  );
};

const defaultComponents: ReactMarkdownOptions['components'] = {
  h1: ({ children }) => {
    return <h1 className='pt-1 pb-1 text-accent-text text-xl'>{children}</h1>;
  },
  h2: ({ children }) => {
    return <h2 className='pt-1 pb-1 text-accent-text text-lg'>{children}</h2>;
  },
  h3: ({ children }) => {
    return <h3 className='pt-1 pb-1 text-accent-text text-base'>{children}</h3>;
  },
  h4: ({ children }) => {
    return <h4 className='pt-1 pb-1 uppercase text-base'>{children}</h4>;
  },
  blockquote: ({ children, ...props }) => (
    <blockquote className='my-2 py-2 ps-4 border-l-4 border-accent-text text-accent-text' {...props}>
      {children}
    </blockquote>
  ),
  p: ({ children }) => {
    return <div className='pt-1 pb-1'>{children}</div>;
  },
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className='text-primary-500 hover:text-primary-500' // TODO(burdon): Use link token.
      target='_blank'
      rel='noopener noreferrer'
      {...props}
    >
      {children}
    </a>
  ),
  // Hide broken images: many markdown sources reference remote URLs that
  // 404 or are blocked. Drop the element on load failure rather than
  // leaving the browser's broken-image placeholder.
  //
  // Media URLs (mp4/mp3/etc. or legacy `iframe`-style embeds) are swapped to a
  // native `<video>` / `<audio>` element by {@link MediaPlayer} so playable
  // media in the source document renders inline.
  img: ({ src, alt }) => {
    if (!src) {
      return null;
    }
    return <MediaPlayer src={src} alt={alt} classNames='w-full' />;
  },
  ol: ({ children, ...props }) => (
    <ol className='pt-1 pb-1 ps-6 leading-tight list-decimal' {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }) => (
    <ul className='pt-1 pb-1 ps-6 leading-tight list-disc' {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className='' {...props}>
      {children}
    </li>
  ),
  pre: ({ children }) => children,
  code: ({ children, className, node }) => {
    const [, language] = /language-(\w+)/.exec(className || '') || [];
    const inline = !className && node?.position?.start.line === node?.position?.end.line;
    if (inline) {
      return <code className='rounded-xs bg-group-surface px-1 py-0.5 text-sm text-info-text'>{children}</code>;
    }

    return (
      <SyntaxHighlighter
        language={language}
        classNames='mt-2 mb-2 p-2 border border-separator rounded-xs text-sm bg-group-surface'
        copyButton
        PreTag='pre'
      >
        {children}
      </SyntaxHighlighter>
    );
  },
};
