//
// Copyright 2025 DXOS.org
//

import React, { type ComponentProps, type ComponentPropsWithRef, type PropsWithChildren } from 'react';
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { MediaPlayer, type ThemedClassName } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

export type MarkdownViewProps = ThemedClassName<
  ComponentPropsWithRef<'div'> & {
    content?: string;
    components?: ReactMarkdownOptions['components'];
    /**
     * Render every block — headings, quotes, lists, code, tables — at the container's font size and
     * line height with no vertical padding or margin, so each line is the same height. For a
     * clamped preview (`line-clamp-*`), which otherwise cuts partway into a line.
     */
    uniformLineHeight?: boolean;
  }
> & {
  /** Merged by a parent rendering this `asChild`; consumers use `classNames`. */
  className?: string;
};

/**
 * Transforms markdown text into react elements.
 * https://github.com/remarkjs/react-markdown
 * markdown -> remark -> [mdast -> remark plugins] -> [hast -> rehype plugins] -> components -> react elements.
 * Consider using @dxos/react-ui-editor.
 */
// Spreads the rest so a parent rendering it `asChild` (a fieldset's helper text) lands its attributes here.
export const MarkdownView = ({
  classNames,
  className,
  children,
  components,
  content = '',
  uniformLineHeight = false,
  ...props
}: MarkdownViewProps) => {
  return (
    <div {...props} className={mx(classNames, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{ ...defaultComponents, ...(uniformLineHeight && uniformComponents), ...components }}
      >
        {content}
      </ReactMarkdown>
      {children}
    </div>
  );
};

/** The default link renderer, for a host that overrides `a` for some links and wants the rest as they were. */
export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'>) => (
  <a
    href={href}
    className='text-primary-500 hover:text-primary-500' // TODO(burdon): Use link token.
    target='_blank'
    rel='noopener noreferrer'
    {...props}
  >
    {children}
  </a>
);

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
  a: (props) => <MarkdownLink {...props} />,
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
        classNames='mt-2 mb-2 p-2 border border-separator rounded-xs text-sm dx-group-surface'
        copyButton
        PreTag='pre'
      >
        {children}
      </SyntaxHighlighter>
    );
  },
};

// Preflight already resets heading sizes and block margins, so each block only has to avoid adding
// its own padding, font size or leading; horizontal insets and borders do not change a line's height.
const uniformHeading = ({ children }: PropsWithChildren) => <div className='font-medium'>{children}</div>;

const uniformComponents: ReactMarkdownOptions['components'] = {
  h1: uniformHeading,
  h2: uniformHeading,
  h3: uniformHeading,
  h4: uniformHeading,
  h5: uniformHeading,
  h6: uniformHeading,
  p: ({ children }) => <div>{children}</div>,
  blockquote: ({ children }) => <blockquote className='ps-2 border-l-2 border-accent-text'>{children}</blockquote>,
  ul: ({ children }) => <ul className='ps-5 list-disc'>{children}</ul>,
  ol: ({ children }) => <ol className='ps-5 list-decimal'>{children}</ol>,
  pre: ({ children }) => <pre className='font-mono whitespace-pre-wrap'>{children}</pre>,
  code: ({ children }) => <code className='font-mono text-info-text'>{children}</code>,
  table: ({ children }) => <table className='border-collapse'>{children}</table>,
  th: ({ children }) => <th className='p-0 pe-4 text-start font-medium'>{children}</th>,
  td: ({ children }) => <td className='p-0 pe-4'>{children}</td>,
  // A rule or an image has no line of text to align, so it gives way to its alt text or to nothing.
  hr: () => null,
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
};
