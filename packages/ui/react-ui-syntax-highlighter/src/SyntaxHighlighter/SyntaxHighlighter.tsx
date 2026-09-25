//
// Copyright 2024 DXOS.org
//

import React, { Children, type ReactNode, memo } from 'react';
import { type SyntaxHighlighterProps as NaturalSyntaxHighlighterProps } from 'react-syntax-highlighter';
import NativeSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-async-light';
import { coldarkDark as dark, coldarkCold as light } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { ScrollArea, SystemIconButton, composable, composableProps, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { type AllowedAxis } from '@dxos/ui-types';

import { renderRows } from './renderer.ts';

const zeroWidthSpace = '\u200b';

const languages = {
  js: 'javascript',
  ts: 'typescript',
};

/**
 * Above this, source is rendered unhighlighted. react-syntax-highlighter splices every line into a
 * single token array and wraps every token in an inline-styled element, so tokenizing grows
 * super-linearly in one synchronous render — a 3 MB payload takes about 30 s, and past roughly 123k
 * lines it throws. Plain text skips the tokenizer and keeps this component's own `pre`/`code` styles.
 */
const MAX_HIGHLIGHTED_LENGTH = 20_000;

export type SyntaxHighlighterProps = Pick<
  NaturalSyntaxHighlighterProps,
  | 'language'
  | 'renderer'
  | 'showLineNumbers'
  | 'showInlineLineNumbers'
  | 'startingLineNumber'
  | 'wrapLines'
  | 'wrapLongLines'
  | 'PreTag'
> & {
  themeStyle?: NaturalSyntaxHighlighterProps['style'];
  fallback?: string;
  copyButton?: boolean;
  /**
   * The axes the built-in `ScrollArea` scrolls on (default: all). `false` renders the bare,
   * non-scrolling leaf for composition inside `Syntax.Viewport`.
   */
  scroll?: AllowedAxis | false;
};

/**
 * Highlighted source inside the family's themed `ScrollArea`, so a long line scrolls with the thin
 * scrollbar rather than the platform's. Pass `scroll={false}` to get the bare leaf.
 *
 * NOTE: Using `light-async` version directly from dist to avoid any chance of the heavy one being loaded.
 * The lightweight version will load specific language parsers asynchronously.
 *
 * https://github.com/react-syntax-highlighter/react-syntax-highlighter
 * https://react-syntax-highlighter.github.io/react-syntax-highlighter/demo/prism.html
 */
export const SyntaxHighlighter = composable<HTMLDivElement, SyntaxHighlighterProps>(
  ({ scroll = 'all', copyButton, classNames, className, role, style, ...props }, forwardedRef) => {
    if (scroll === false) {
      return (
        <SyntaxHighlighterLeaf
          {...props}
          {...{ classNames, className, role, style }}
          copyButton={copyButton}
          ref={forwardedRef}
        />
      );
    }

    // The copy button sits on the scroll root so it stays put while the source scrolls under it.
    const source = sourceOf(props.children, props.fallback);
    return (
      <ScrollArea.Root
        role={role ?? 'none'}
        style={style}
        classNames={[className, classNames, copyButton && 'relative group']}
        orientation={scroll}
        thin
        ref={forwardedRef}
      >
        <ScrollArea.Viewport>
          <SyntaxHighlighterLeaf {...props} />
        </ScrollArea.Viewport>
        {copyButton && <CopyOverlay source={source} />}
      </ScrollArea.Root>
    );
  },
);

SyntaxHighlighter.displayName = 'SyntaxHighlighter';

const sourceOf = (children: ReactNode, fallback = zeroWidthSpace): string =>
  Children.toArray(children).join('') || fallback;

const CopyOverlay = ({ source }: { source: string }) => (
  <div className='pointer-events-none absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100'>
    <SystemIconButton.Clipboard
      iconOnly
      value={source}
      variant='ghost'
      size={4}
      classNames='pointer-events-auto aspect-square rounded-sm'
    />
  </div>
);

/** The non-scrolling leaf: all scrolling is deferred to an enclosing viewport. */
const SyntaxHighlighterLeaf = composable<HTMLDivElement, Omit<SyntaxHighlighterProps, 'scroll'>>(
  (
    {
      classNames,
      className,
      children,
      role,
      style,
      themeStyle,
      language: languageProp = 'text',
      fallback = zeroWidthSpace,
      copyButton,
      ...nativeProps
    },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();
    const source = sourceOf(children, fallback);
    const language = source.length > MAX_HIGHLIGHTED_LENGTH ? 'text' : languageProp;

    const hasCustomTheme = themeStyle && typeof themeStyle === 'object' && Object.keys(themeStyle).length > 0;
    const prismTheme = hasCustomTheme ? themeStyle : themeMode === 'dark' ? dark : light;

    return (
      <div
        {...composableProps(
          { classNames, className, role, style },
          {
            role: 'none',
            classNames: mx('dx-expand overflow-visible p-1', copyButton && 'relative group'),
          },
        )}
        ref={forwardedRef}
      >
        <HighlightedSource
          language={languages[language as keyof typeof languages] || language}
          style={prismTheme}
          {...nativeProps}
        >
          {source}
        </HighlightedSource>

        {copyButton && <CopyOverlay source={source} />}
      </div>
    );
  },
);

SyntaxHighlighterLeaf.displayName = 'SyntaxHighlighterLeaf';

const customStyle: NaturalSyntaxHighlighterProps['customStyle'] = {
  background: 'unset',
  border: 'none',
  boxShadow: 'none',
  padding: 0,
  margin: 0,
  // This allows setting max-h-[6lh] on the Syntax.Code component.
  lineHeight: 'inherit',
  // Non-scrolling wrapper: defer all scrolling to an enclosing `Syntax.Viewport`.
  // The prism theme sets `overflow: auto` on the <pre>, which otherwise creates a
  // nested native horizontal scrollbar alongside the viewport's custom one.
  overflow: 'visible',
};

const codeTagProps: NaturalSyntaxHighlighterProps['codeTagProps'] = {
  style: {
    lineHeight: 'inherit',
    // `block`, not the default `inline`: as an inline box every line is the union of the
    // <pre>'s strut and this element's own box, and the two carry different font stacks
    // (the prism theme's vs the app's), so lines advanced 16.5px under a 16px
    // line-height — enough that a `max-h-[Nlh]` cap showed N-1 lines and a sliver.
    display: 'block',
  },
};

type HighlightedSourceProps = Omit<SyntaxHighlighterProps, 'themeStyle' | 'fallback' | 'copyButton' | 'scroll'> & {
  style: NaturalSyntaxHighlighterProps['style'];
  children: string;
};

/**
 * Memoized on primitive props because tokenizing and building the element tree is the expensive
 * part, and streaming parents (e.g. the assistant's tool panel) re-render with unchanged source.
 */
const HighlightedSource = memo(({ children, renderer, wrapLines, ...props }: HighlightedSourceProps) => (
  <NativeSyntaxHighlighter
    customStyle={customStyle}
    codeTagProps={codeTagProps}
    renderer={renderer ?? renderRows}
    // Any renderer makes the library default `wrapLines` to true; only a caller's own renderer should get that.
    wrapLines={wrapLines ?? (renderer ? undefined : false)}
    {...props}
  >
    {/* Non-empty fallback prevents collapse. */}
    {children}
  </NativeSyntaxHighlighter>
));

HighlightedSource.displayName = 'HighlightedSource';

SyntaxHighlighter.displayName = 'SyntaxHighlighter';
