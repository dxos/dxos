//
// Copyright 2026 DXOS.org
//

import type { Element, ElementContent, Properties, Root } from 'hast';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import React, {
  type ComponentType,
  type MouseEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

import { SyntaxHighlighter, type SyntaxHighlighterProps, renderRows } from '@dxos/react-ui-syntax-highlighter';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { LAYOUT_SLOTS, type SlotName, SURFACE_ROLES, type SurfaceRole, parseSlide, parseSourceRange } from '#markdown';

import { slideThemeClasses, useSlideColorScheme, useSlideThemeStyle } from '../SlideTheme/index.ts';
import { ActiveSlotContext, layouts } from './layouts.tsx';
import { SlideBackground } from './SlideBackground.tsx';
import { theme } from './theme.ts';

export type SlideSurfaceRole = SurfaceRole;

export type MarkdownSlideProps = Util.ThemedClassName<{
  /** One slide's markdown, optionally starting with a `---` frontmatter block. */
  content: string;
  /** Click step; elements with a later step stay laid out but invisible (default: all revealed). */
  step?: number;
  /** Renders an embedded `<Surface>`; without it a labelled placeholder is shown. */
  renderSurface?: (props: { uri: string; role: SlideSurfaceRole }) => ReactNode;
  /** Slot to outline, e.g. the one holding the editor's cursor. */
  activeSlot?: SlotName;
  /** Called with the `[start, end]` source offsets of the clicked element. */
  onSourceClick?: (range: [start: number, end: number]) => void;
  /** The slide's own image (a generated artifact's URL), placed as frontmatter `image:` would be, over it. */
  image?: string;
}>;

/**
 * Renders one slide of the Slidev markdown subset on the 2560×1440 canvas (wrap it in `SlideFrame` to scale).
 */
export const MarkdownSlide = ({
  classNames,
  content,
  step,
  renderSurface,
  activeSlot,
  onSourceClick,
  image,
}: MarkdownSlideProps) => {
  const parsed = useMemo(() => parseSlide(content), [content]);
  const frontmatter = useMemo(
    () => (image ? { ...parsed.frontmatter, image } : parsed.frontmatter),
    [parsed.frontmatter, image],
  );

  const slots = useMemo((): Record<SlotName, ReactNode> => {
    const current = step ?? Number.POSITIVE_INFINITY;
    // An empty slot is null so layouts can tell content from nothing.
    const render = (slot: SlotName) =>
      hasContent(parsed.slots[slot])
        ? toJsxRuntime(prepareRoot(parsed.slots[slot], current), { Fragment, jsx, jsxs, components })
        : null;
    return {
      'default': render('default'),
      'left': render('left'),
      'middle': render('middle'),
      'right': render('right'),
      'bottom-left': render('bottom-left'),
      'bottom-right': render('bottom-right'),
    };
  }, [parsed, step]);

  const themeStyle = useSlideThemeStyle();
  const Layout = layouts[parsed.layout];
  // Layouts without a `left` slot render `::left::` content inside the first region.
  const outlinedSlot = activeSlot === 'left' && !LAYOUT_SLOTS[parsed.layout]?.includes('left') ? 'default' : activeSlot;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const element = event.target instanceof Element ? event.target.closest('[data-source]') : null;
      // A slide embedded in this one has its own source offsets, which do not index this slide's markdown.
      if (element?.closest('[data-slide]') !== event.currentTarget) {
        return;
      }
      const range = parseSourceRange(element.getAttribute('data-source'));
      if (range) {
        onSourceClick?.(range);
      }
    },
    [onSourceClick],
  );

  return (
    <div
      data-slide
      className={mx(
        'relative size-full overflow-hidden',
        slideThemeClasses,
        theme.root,
        parsed.frontmatter.class,
        onSourceClick && 'cursor-text',
        classNames,
      )}
      style={themeStyle}
      onClick={onSourceClick ? handleClick : undefined}
    >
      <SlideBackground frontmatter={frontmatter} layout={parsed.layout} />
      <div className='relative size-full'>
        <RenderSurfaceContext.Provider value={renderSurface}>
          <ActiveSlotContext.Provider value={outlinedSlot}>
            <Layout slots={slots} frontmatter={frontmatter} />
          </ActiveSlotContext.Provider>
        </RenderSurfaceContext.Provider>
      </div>
    </div>
  );
};

//
// Components for the elements `prepareRoot` emits beyond HTML.
//

type SlideCodeProps = { 'language'?: string; 'meta'?: string; 'source'?: string; 'data-source'?: string };

// `className` and `data-step` carry click-step visibility from `prepareElement`.
type SlideSurfaceProps = { 'uri'?: string; 'role'?: string; 'className'?: string; 'data-step'?: string };

type SlideComponents = Partial<Components> & {
  [tag: `slide-${string}`]: ComponentType<SlideCodeProps> | ComponentType<SlideSurfaceProps>;
};

const isSurfaceRole = (role: string | undefined): role is SlideSurfaceRole =>
  SURFACE_ROLES.some((value) => value === role);

// Read through context so the component map stays constant and an inline `renderSurface` never remounts surfaces.
const RenderSurfaceContext = createContext<MarkdownSlideProps['renderSurface']>(undefined);

const SlideSurface = ({ uri = '', role, className, 'data-step': dataStep }: SlideSurfaceProps) => {
  const renderSurface = useContext(RenderSurfaceContext);
  const surfaceRole: SlideSurfaceRole = isSurfaceRole(role) ? role : 'slide';
  return (
    // `data-embed`, not the theme's `data-surface` (a surface tone), which would paint the embed with a surface fill.
    <div data-embed={uri} data-role={surfaceRole} data-step={dataStep} className={mx('flex dx-grow', className)}>
      {renderSurface?.({ uri, role: surfaceRole }) ?? (
        <div className='flex grow items-center justify-center p-8 border-4 border-dashed border-separator text-[32px]'>
          {`${surfaceRole}: ${uri}`}
        </div>
      )}
    </div>
  );
};

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

const CodeBlock = ({ language, meta, source = '', 'data-source': dataSource }: SlideCodeProps) => {
  const themeMode = useSlideColorScheme();
  const renderer = useMemo(() => {
    const lines = parseLineHighlights(meta, source.replace(/\n$/, '').split('\n').length);
    return lines && lineHighlightRenderer(lines);
  }, [meta, source]);
  const lineNumbers = parseLineNumbers(meta);
  return (
    <div data-source={dataSource} className='contents'>
      <SyntaxHighlighter
        language={language}
        themeMode={themeMode}
        scroll={false}
        classNames={mx(theme.nodes.pre, theme.nodes.code)}
        PreTag='pre'
        renderer={renderer}
        // Numbers are drawn per row, which needs the source split into rows.
        showLineNumbers={lineNumbers}
        wrapLines={renderer !== undefined || lineNumbers}
      >
        {source.replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

const components: SlideComponents = {
  'slide-code': CodeBlock,
  'slide-surface': SlideSurface,
};

// Bounds a range like `{1-100000000}` so a fence cannot allocate an enormous set.
const MAX_HIGHLIGHT_LINE = 10_000;

/**
 * Lines named by a fence's `{2,4-5}` meta; for click-stepped `{1|2-3}` only the first step applies.
 * Ranges are clamped to `lineCount`; returns undefined when every line is shown plainly.
 */
export const parseLineHighlights = (
  meta: string | undefined,
  lineCount = MAX_HIGHLIGHT_LINE,
): Set<number> | undefined => {
  const last = Math.min(lineCount, MAX_HIGHLIGHT_LINE);
  // The first `{...}` that is not an option block such as `{lines:true}`.
  const ranges = meta && /\{([^}:]*)\}/.exec(meta)?.[1].split('|')[0].trim();
  if (!ranges || ranges === '*' || ranges === 'all') {
    return undefined;
  }
  const lines = new Set<number>();
  for (const range of ranges.split(',')) {
    const [start, end = start] = range.split('-').map((value) => Number(value.trim()));
    if (Number.isInteger(start) && Number.isInteger(end)) {
      for (let line = Math.max(start, 1); line <= Math.min(end, last); line++) {
        lines.add(line);
      }
    }
  }
  return lines.size > 0 ? lines : undefined;
};

/** Whether a fence's meta turns on line numbers, as Slidev's `{lines:true}` option does. */
export const parseLineNumbers = (meta: string | undefined): boolean =>
  meta !== undefined && /\{[^}]*\blines\s*:\s*true\b[^}]*\}/.test(meta);

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

const hasContent = (root: Root): boolean =>
  root.children.some((child) => child.type !== 'text' || child.value.trim().length > 0);

const prepareRoot = (root: Root, step: number): Root => ({
  ...root,
  children: root.children.map((child) => (child.type === 'element' ? prepareElement(child, step, false) : child)),
});

const prepareElement = (element: Element, step: number, inPre: boolean): Element => {
  const properties: Properties = { ...element.properties };
  const ownStep = properties.step ?? undefined;
  delete properties.step;
  const withStep = (props: Properties): Properties =>
    ownStep === undefined ? props : stepProperties(props, ownStep, step);

  const [code] = element.children;
  if (element.tagName === 'pre' && element.children.length === 1 && code.type === 'element') {
    const block = codeElement(code, element.properties.dataSource);
    return ownStep === undefined
      ? block
      : { type: 'element', tagName: 'div', properties: withStep({}), children: [block] };
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
    // A sanitized link has an empty href, which a new tab would resolve to the app itself.
    if (typeof properties.href === 'string' && properties.href.length > 0) {
      properties.target = '_blank';
      properties.rel = ['noopener', 'noreferrer'];
    } else {
      delete properties.href;
    }
  }

  const themed = tagName === 'code' && !inPre ? theme.nodes.inlineCode : NODE_CLASSES[tagName];
  if (themed) {
    properties.className = [themed, ...classList(properties.className)];
  }

  return {
    ...element,
    tagName,
    properties: withStep(properties),
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
const codeElement = (code: Element, dataSource: Properties[string]): Element => {
  const language = classList(code.properties.className)
    .find((name) => name.startsWith('language-'))
    ?.slice('language-'.length);
  return {
    type: 'element',
    tagName: 'slide-code',
    properties: {
      language,
      meta: code.data?.meta ?? undefined,
      source: code.children.map(textOf).join(''),
      dataSource,
    },
    children: [],
  };
};
