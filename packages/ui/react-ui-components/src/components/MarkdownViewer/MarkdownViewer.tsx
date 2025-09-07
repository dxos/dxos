//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';
import ReactMarkdown from 'react-markdown';
import { type ReactMarkdownOptions } from 'react-markdown/lib/react-markdown';

import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { omit } from '@dxos/util';

// TODO(burdon): Benchmark vs. codemirror, which would be more consistent.

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
export const MarkdownViewer = ({ classNames, children, components, content = '' }: MarkdownViewerProps) => {
  return (
    <div className={mx('inline-block', classNames)}>
      <ReactMarkdown
        className='inline-block'
        skipHtml
        components={{
          h1: ({ children }) => {
            return <h1 className='pbs-1 pbe-1 text-xl'>{children}</h1>;
          },
          h2: ({ children }) => {
            return <h2 className='pbs-1 pbe-1 text-lg'>{children}</h2>;
          },
          h3: ({ children }) => {
            return <h3 className='pbs-1 pbe-1 text-base'>{children}</h3>;
          },
          p: ({ children }) => {
            return <div className='pbs-1 pbe-1'>{children}</div>;
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
            <blockquote
              className='pis-4 mbs-2 mbe-2 pbs-2 pbe-2 border-l-4 border-primary-500 text-primary-500'
              {...props}
            >
              {children}
            </blockquote>
          ),
          pre: ({ children }) => children,
          // TODO(burdon): Copy/paste button.
          code: ({ children, className }) => {
            const [, language] = /language-(\w+)/.exec(className || '') || [];
            return (
              <SyntaxHighlighter
                PreTag='div'
                language={language}
                classNames='mbs-2 mbe-2 !p-2 border border-separator rounded-sm text-sm !bg-groupSurface'
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
      {children}
    </div>
  );
};
