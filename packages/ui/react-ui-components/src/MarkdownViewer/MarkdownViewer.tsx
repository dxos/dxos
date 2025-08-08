//
// Copyright 2025 DXOS.org
//

import React from 'react';
import ReactMarkdown from 'react-markdown';

import { type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { omit } from '@dxos/util';
import { DXN } from '@dxos/keys';

// TODO(burdon): Benchmark vs. codemirror, which would be more consistent.

export type MarkdownViewerProps = ThemedClassName<{
  content?: string;
  DxnLink?: (props: { dxn: DXN }) => React.ReactNode;
}>;

/**
 * Transforms markdown text into react elements.
 * https://github.com/remarkjs/react-markdown
 * markdown -> remark -> [mdast -> remark plugins] -> [hast -> rehype plugins] -> components -> react elements.
 */
export const MarkdownViewer = ({ classNames, DxnLink, content = '' }: MarkdownViewerProps) => {
  return (
    <div className={mx('gap-2', classNames)}>
      <ReactMarkdown
        components={{
          p: ({ node, children, ...props }) => {
            return <div className='pbs-1 pbe-1'>{children}</div>;
          },
          a: ({ node, children, href, ...props }) => {
            console.log({ node, children, href, props });
            if (children.length === 1 && typeof children[0] === 'string' && children[0].startsWith('dxn')) {
              let dxn: DXN | undefined;
              try {
                dxn = DXN.parse(children[0]);
              } catch {}
              if (dxn && DxnLink) {
                return <DxnLink dxn={dxn} />;
              }
            }

            return (
              <a
                href={href}
                className='text-primary-500 hover:text-primary-500' // TODO(burdon): Token.
                target='_blank'
                rel='noopener noreferrer'
                {...props}
              >
                {children}
              </a>
            );
          },
          ol: ({ node, children, ...props }) => (
            <ol className='pbs-1 pbe-1 pis-6 leading-tight list-decimal' {...omit(props, ['ordered'])}>
              {children}
            </ol>
          ),
          ul: ({ node, children, ...props }) => (
            <ul className='pbs-1 pbe-1 pis-6 leading-tight list-disc' {...omit(props, ['ordered'])}>
              {children}
            </ul>
          ),
          li: ({ node, children, ...props }) => (
            <li className='' {...omit(props, ['ordered'])}>
              {children}
            </li>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote className='pis-4 pbs-4 pbe-4 border-l-4 border-primary-500 text-primary-500' {...props}>
              {children}
            </blockquote>
          ),
          pre: ({ node, children, ...props }) => children,
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
