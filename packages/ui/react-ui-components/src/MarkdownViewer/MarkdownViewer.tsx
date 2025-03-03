//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';
import ReactMarkdown from 'react-markdown';

import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { omit } from '@dxos/util';

type MarkdownViewerProps = ThemedClassName<{
  content?: string;
}>;

/**
 * Transform text into react elements.
 *
 * https://github.com/remarkjs/react-markdown
 * markdown -> remark -> [mdast -> remark plugins] -> [hast -> rehype plugins] -> components -> react elements.
 */
// TODO(burdon): Styles.
// TODO(burdon): Factor out (react-ui-syntax-highlighter).
export const MarkdownViewer: FC<MarkdownViewerProps> = ({ classNames, content = '' }) => {
  return (
    <div className={mx('space-y-2', classNames)}>
      <ReactMarkdown
        components={{
          a: ({ node, children, href, ...props }) => (
            <a
              href={href}
              className='text-primary-500 hover:text-primary-500'
              target='_blank'
              rel='noopener noreferrer'
              {...props}
            >
              {children}
            </a>
          ),
          ol: ({ node, children, ...props }) => (
            <ol className='leading-tight list-decimal pl-6' {...omit(props, ['ordered'])}>
              {children}
            </ol>
          ),
          ul: ({ node, children, ...props }) => (
            <ul className='leading-tight list-disc pl-6' {...omit(props, ['ordered'])}>
              {children}
            </ul>
          ),
          li: ({ node, children, ...props }) => (
            <li className='' {...omit(props, ['ordered'])}>
              {children}
            </li>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote className='border-l-4 border-primary-500 pl-4 my-4 text-primary-500' {...props}>
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const [_, language] = /language-(\w+)/.exec(className || '') || [];
            return (
              <SyntaxHighlighter PreTag='div' language={language} className='p-0'>
                {children}
              </SyntaxHighlighter>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// const Cursor = () => {
//   return <span className='animate-[pulse_1s_steps(1)_infinite] text-primary-500'>▊</span>;
// };
