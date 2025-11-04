//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Benchmark vs. codemirror (which would be more consistent).
// TODO(burdon): Checkbox (input).

export type MarkdownViewerProps = ThemedClassName<
  PropsWithChildren<{
    content?: string;
    components?: ReactMarkdownOptions['components'];
  }>
>;

/**
 * Transforms markdown text into react elements.
 * https://github.com/remarkjs/react-markdown
 * markdown -> remark -> [mdast -> remark plugins] -> [hast -> rehype plugins] -> components -> react elements.
 */
export const MarkdownViewer = ({ classNames, children, components, content = '' }: MarkdownViewerProps) => (
  <div className={mx(classNames)}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ ...defaultComponents, ...components }}>
      {content}
    </ReactMarkdown>
    {children}
  </div>
);

const defaultComponents: ReactMarkdownOptions['components'] = {
  h1: ({ children }) => <h1 className='pbs-1 pbe-1 text-xl'>{children}</h1>,
  h2: ({ children }) => <h2 className='pbs-1 pbe-1 text-lg'>{children}</h2>,
  h3: ({ children }) => <h3 className='pbs-1 pbe-1 text-base'>{children}</h3>,
  blockquote: ({ children, ...props }) => (
    <blockquote className='pis-4 mbs-2 mbe-2 pbs-2 pbe-2 border-l-4 border-accentText text-accentText' {...props}>
      {children}
    </blockquote>
  ),
  p: ({ children }) => <div className='pbs-1 pbe-1'>{children}</div>,
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
  ol: ({ children, ...props }) => (
    <ol className='pbs-1 pbe-1 pis-6 leading-tight list-decimal' {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }) => (
    <ul className='pbs-1 pbe-1 pis-6 leading-tight list-disc' {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className='' {...props}>
      {children}
    </li>
  ),
  pre: ({ children }) => children,
  // TODO(burdon): Copy/paste button.
  code: ({ children, className }) => {
    const [, language] = /language-(\w+)/.exec(className || '') || [];
    return (
      <SyntaxHighlighter
        language={language}
        classNames='mbs-2 mbe-2 border border-separator rounded-sm text-sm bg-groupSurface'
        PreTag='pre'
      >
        {children}
      </SyntaxHighlighter>
    );
  },
};
