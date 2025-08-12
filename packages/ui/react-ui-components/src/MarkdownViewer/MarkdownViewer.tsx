//
// Copyright 2025 DXOS.org
//

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { type ReactMarkdownOptions } from 'react-markdown/lib/react-markdown';

import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { omit } from '@dxos/util';

// TODO(burdon): Benchmark vs. codemirror, which would be more consistent.

export type MarkdownViewerProps = ThemedClassName<{
  content?: string;
  components?: ReactMarkdownOptions['components'];
}>;

/**
 * Transforms markdown text into react elements.
 * https://github.com/remarkjs/react-markdown
 * markdown -> remark -> [mdast -> remark plugins] -> [hast -> rehype plugins] -> components -> react elements.
 */
export const MarkdownViewer = ({ classNames, components, content = '' }: MarkdownViewerProps) => {
  return (
    <div className={mx('gap-2', classNames)}>
      <ReactMarkdown
        skipHtml
        components={{
          p: ({ children }) => {
            return <div className='pbs-1 pbe-1'>{children}</div>;
          },
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className='text-primary-500 hover:text-primary-500' // TODO(burdon): Use token.
              target='_blank'
              rel='noopener noreferrer'
              {...props}
            >
              {children}
            </a>
          ),
          ol: ({ children, ...props }) => (
            <ol className='pbs-1 pbe-1 pis-6 leading-tight list-decimal' {...omit(props, ['ordered'])}>
              {children}
            </ol>
          ),
          ul: ({ children, ...props }) => (
            <ul className='pbs-1 pbe-1 pis-6 leading-tight list-disc' {...omit(props, ['ordered'])}>
              {children}
            </ul>
          ),
          li: ({ children, ...props }) => (
            <li className='' {...omit(props, ['ordered'])}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className='pis-4 pbs-4 pbe-4 border-l-4 border-primary-500 text-primary-500' {...props}>
              {children}
            </blockquote>
          ),
          pre: ({ children }) => children,
          code: ({ children, className }) => {
            const [_, language] = /language-(\w+)/.exec(className || '') || [];
            // TODO(burdon): Copy/paste button.
            return (
              <SyntaxHighlighter
                PreTag='div'
                language={language}
                className='mbs-2 mbe-2 border border-separator rounded-sm'
              >
                {children}
              </SyntaxHighlighter>
            );
          },
          ...components,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
