//
// Copyright 2026 DXOS.org
//

import type { Element, ElementContent, Properties, Root } from 'hast';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import React, { type ComponentType, type ReactNode, useEffect, useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

import { SyntaxHighlighter, type SyntaxHighlighterProps, renderRows } from '@dxos/react-ui-syntax-highlighter';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { SURFACE_ROLES, type SlotName, type SurfaceRole, parseSlide } from '#markdown';

import { layouts } from './layouts.tsx';
import { SlideBackground } from './SlideBackground.tsx';
import { theme } from './theme.ts';

export type SlideSurfaceRole = SurfaceRole;

export type MarkdownSlideProps = Util.ThemedClassName<{
  /** One slide's markdown, optionally starting with a `---` frontmatter block. */
  content: string;
  /** Click step; elements with a later step stay laid out but invisible (default: all revealed). */
  step?: number;
  /** Called with the slide's click count whenever it changes. */
  onClicks?: (count: number) => void;
  /** Renders an embedded `<Surface>`; without it a labelled placeholder is shown. */
  renderSurface?: (props: { uri: string; role: SlideSurfaceRole }) => ReactNode;
}>;

/**
 * Renders one slide of the Slidev markdown subset on the 2560×1440 canvas (wrap it in `SlideFrame` to scale).
 */
export const MarkdownSlide = ({ classNames, content, step, onClicks, renderSurface }: MarkdownSlideProps) => {
  const parsed = useMemo(() => parseSlide(content), [content]);
  useEffect(() => {
    onClicks?.(parsed.clicks);
  }, [parsed.clicks, onClicks]);

  const components = useMemo(() => createComponents(renderSurface), [renderSurface]);
  const slots = useMemo((): Record<SlotName, ReactNode> => {
    const current = step ?? Number.POSITIVE_INFINITY;
    const render = (slot: SlotName) =>
      toJsxRuntime(prepareRoot(parsed.slots[slot], current), { Fragment, jsx, jsxs, components });
    return { default: render('default'), left: render('left'), right: render('right') };
  }, [parsed, step, components]);

  const Layout = layouts[parsed.layout];
  return (
    <div
      data-slide
      className={mx('relative size-full overflow-hidden', theme.root, parsed.frontmatter.class, classNames)}
    >
      <SlideBackground frontmatter={parsed.frontmatter} layout={parsed.layout} />
      <div className='relative size-full'>
        <Layout slots={slots} frontmatter={parsed.frontmatter} />
      </div>
    </div>
  );
};

//
// Components for the elements `prepareRoot` emits beyond HTML.
//

type SlideCodeProps = { language?: string; meta?: string; source?: string };

type SlideSurfaceProps = { uri?: string; role?: string };

type SlideComponents = Partial<Components> & {
  [tag: `slide-${string}`]: ComponentType<SlideCodeProps> | ComponentType<SlideSurfaceProps>;
};

const isSurfaceRole = (role: string | undefined): role is SlideSurfaceRole =>
  SURFACE_ROLES.some((value) => value === role);

const createComponents = (renderSurface: MarkdownSlideProps['renderSurface']): SlideComponents => ({
  'slide-code': CodeBlock,
  'slide-surface': ({ uri = '', role }: SlideSurfaceProps) => {
    const surfaceRole: SlideSurfaceRole = isSurfaceRole(role) ? role : 'slide';
    return (
      <div data-surface={uri} data-role={surfaceRole} className='flex dx-grow'>
        {renderSurface?.({ uri, role: surfaceRole }) ?? (
          <div className='flex grow items-center justify-center p-8 border-4 border-dashed border-separator text-[32px]'>
            {`${surfaceRole}: ${uri}`}
          </div>
        )}
      </div>
    );
  },
});

type Renderer = NonNullable<SyntaxHighlighterProps['renderer']>;

// The library only numbers lines for `lineProps` when line numbers are shown, so rows are marked by index instead.
const lineHighlightRenderer =
  (lines: Set<number>): Renderer =>
  (props) =>
    renderRows({
      ...props,
      rows: props.rows.map((row, index) => ({
        ...row,
        properties: {
          ...row.properties,
          className: [
            ...(row.properties?.className ?? []),
            ...(lines.has(index + 1) ? theme.line.highlighted : theme.line.dimmed).split(' '),
          ],
        },
      })),
    });

const CodeBlock = ({ language, meta, source = '' }: SlideCodeProps) => {
  const renderer = useMemo(() => {
    const lines = parseLineHighlights(meta);
    return lines && lineHighlightRenderer(lines);
  }, [meta]);
  return (
    <SyntaxHighlighter
      language={language}
      scroll={false}
      classNames={mx(theme.nodes.pre, theme.nodes.code)}
      PreTag='pre'
      renderer={renderer}
      wrapLines={renderer !== undefined}
    >
      {source.replace(/\n$/, '')}
    </SyntaxHighlighter>
  );
};

/**
 * Lines named by a fence's `{2,4-5}` meta; for click-stepped `{1|2-3}` only the first step applies.
 * Returns undefined when every line is shown plainly.
 */
export const parseLineHighlights = (meta: string | undefined): Set<number> | undefined => {
  const ranges = meta && /\{([^}]*)\}/.exec(meta)?.[1].split('|')[0].trim();
  if (!ranges || ranges === '*' || ranges === 'all') {
    return undefined;
  }
  const lines = new Set<number>();
  for (const range of ranges.split(',')) {
    const [start, end = start] = range.split('-').map((value) => Number(value.trim()));
    if (Number.isInteger(start) && Number.isInteger(end)) {
      for (let line = start; line <= end; line++) {
        lines.add(line);
      }
    }
  }
  return lines.size > 0 ? lines : undefined;
};

//
// hast preparation: click visibility, theme classes and custom elements.
//

const CLICK_TAGS = new Set(['slide-click', 'slide-clicks', 'slide-after']);

const BLOCK_TAGS = new Set([
  'blockquote',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'table',
  'ul',
  'slide-click',
  'slide-clicks',
  'slide-after',
  'slide-surface',
]);

const NODE_CLASSES: Record<string, string> = theme.nodes;

const classList = (value: Properties[string]): string[] =>
  Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/\s+/) : [];

const textOf = (node: ElementContent): string =>
  node.type === 'text' ? node.value : node.type === 'element' ? node.children.map(textOf).join('') : '';

const prepareRoot = (root: Root, step: number): Root => ({
  ...root,
  children: root.children.map((child) => (child.type === 'element' ? prepareElement(child, step, false) : child)),
});

const prepareElement = (element: Element, step: number, inPre: boolean): Element => {
  const properties: Properties = { ...element.properties };
  const ownStep = properties.step;
  delete properties.step;

  const [code] = element.children;
  if (element.tagName === 'pre' && element.children.length === 1 && code.type === 'element') {
    const block = codeElement(code);
    return ownStep === undefined || ownStep === null
      ? block
      : { type: 'element', tagName: 'div', properties: stepProperties({}, ownStep, step), children: [block] };
  }

  let tagName = element.tagName;
  if (CLICK_TAGS.has(tagName)) {
    delete properties.depth;
    delete properties.every;
    properties.dataClick = tagName;
    tagName = element.children.some((child) => child.type === 'element' && BLOCK_TAGS.has(child.tagName))
      ? 'div'
      : 'span';
  } else if (tagName === 'slide-surface') {
    // `ref` is reserved by React, so the object URI travels under another name.
    properties.uri = properties.ref;
    delete properties.ref;
  } else if (tagName === 'a') {
    properties.target = '_blank';
    properties.rel = ['noopener', 'noreferrer'];
  }

  const themed = tagName === 'code' && !inPre ? theme.nodes.inlineCode : NODE_CLASSES[tagName];
  if (themed) {
    properties.className = [themed, ...classList(properties.className)];
  }

  return {
    ...element,
    tagName,
    properties: ownStep === undefined || ownStep === null ? properties : stepProperties(properties, ownStep, step),
    children: element.children.map((child) =>
      child.type === 'element' ? prepareElement(child, step, inPre || tagName === 'pre') : child,
    ),
  };
};

const stepProperties = (properties: Properties, ownStep: Properties[string], step: number): Properties => {
  const hidden = Number(ownStep) > step;
  return {
    ...properties,
    dataStep: String(ownStep),
    className: hidden ? [...classList(properties.className), 'invisible'] : properties.className,
  };
};

// Fenced code becomes one element carrying its source, so the highlighter receives plain text.
const codeElement = (code: Element): Element => {
  const language = classList(code.properties.className)
    .find((name) => name.startsWith('language-'))
    ?.slice('language-'.length);
  return {
    type: 'element',
    tagName: 'slide-code',
    properties: { language, meta: code.data?.meta ?? undefined, source: code.children.map(textOf).join('') },
    children: [],
  };
};
