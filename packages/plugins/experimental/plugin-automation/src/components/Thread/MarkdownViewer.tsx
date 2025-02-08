//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';
import ReactMarkdown from 'react-markdown';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { omit } from '@dxos/util';

type MarkdownViewerProps = ThemedClassName<{
  content: string;
}>;

// TODO(burdon): Styles.
export const MarkdownViewer: FC<MarkdownViewerProps> = ({ content, classNames }) => {
  return (
    <div className={mx('flex flex-col gap-1', classNames)}>
      <ReactMarkdown
        components={{
          a: ({ node, children, href, ...props }) => (
            <a
              href={href}
              className='text-blue-600 hover:text-blue-800 underline'
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
          code: ({ node, children, ...props }) => (
            <code className='bg-gray-100 rounded px-1 font-mono text-sm' {...props}>
              {children}
            </code>
          ),
          pre: ({ node, children, ...props }) => (
            <pre className='bg-gray-100 rounded p-4 overflow-x-auto my-4 font-mono text-sm' {...props}>
              {children}
            </pre>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote className='border-l-4 border-gray-200 pl-4 my-4 italic text-gray-600' {...props}>
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
