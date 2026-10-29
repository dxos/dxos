//
// Copyright 2026 DXOS.org
//

import type { RootContent as HastContent, Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { SlideTheme } from '#types';

import { type LayoutName, LAYOUTS, type SlideFrontmatter, type SlideIssue, parseFrontmatter } from './frontmatter.ts';
import { type SlotName, SLOTS, remarkSlidev } from './remark-slidev.ts';
import { isolateSlotMarkers } from './split.ts';

/** A single slide parsed into renderable slots plus its metadata. */
export type ParsedSlide = {
  frontmatter: SlideFrontmatter;
  layout: LayoutName;
  slots: Record<SlotName, HastRoot>;
  notes?: string;
  clicks: number;
  issues: SlideIssue[];
};

const markdownProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']).use(remarkSlidev);

// Raw HTML was already rewritten by `remarkSlidev`; `allowDangerousHtml` stays off so none can slip through.
const hastProcessor = unified().use(remarkRehype);

// `runSync` is typed with unist's base node, so the root is narrowed back to mdast here.
const isMdastRoot = (node: { type: string }): node is MdastRoot => node.type === 'root';

const isLayout = (value: string): value is LayoutName => LAYOUTS.some((layout) => layout === value);

/**
 * Parses one slide's markdown (optionally starting with a `---` frontmatter block) into hast slots, notes and
 * click count; problems are reported as issues and never prevent the slide from rendering.
 */
export const parseSlide = (content: string): ParsedSlide => {
  const isolated = isolateSlotMarkers(content);
  const tree = markdownProcessor.runSync(markdownProcessor.parse(isolated.text));
  const slidev = isMdastRoot(tree) ? tree.data?.slidev : undefined;
  const issues: SlideIssue[] = [];

  const parsed = slidev?.frontmatter !== undefined ? parseFrontmatter(slidev.frontmatter) : undefined;
  const frontmatter = parsed?.frontmatter ?? {};
  issues.push(...(parsed?.issues ?? []), ...(slidev?.issues ?? []));

  let layout: LayoutName = 'default';
  if (frontmatter.layout !== undefined) {
    if (isLayout(frontmatter.layout)) {
      layout = frontmatter.layout;
    } else {
      issues.push({ kind: 'layout', message: `Unknown layout "${frontmatter.layout}"; using "default".` });
    }
  }

  if (frontmatter.theme !== undefined && !SlideTheme.isName(frontmatter.theme)) {
    issues.push({ kind: 'theme', message: `Unknown theme "${frontmatter.theme}"; using "default".` });
  }

  const toHast = (slot: SlotName): HastRoot => {
    const root = hastProcessor.runSync(slidev?.slots[slot] ?? { type: 'root', children: [] });
    root.children.forEach((child) => markSource(child, isolated.toSource));
    return root;
  };

  return {
    frontmatter,
    layout,
    slots: {
      'default': toHast('default'),
      'left': toHast('left'),
      'middle': toHast('middle'),
      'right': toHast('right'),
      'bottom-left': toHast('bottom-left'),
      'bottom-right': toHast('bottom-right'),
    },
    notes: slidev?.notes,
    clicks: slidev?.clicks ?? 0,
    issues,
  };
};

type Range = [start: number, end: number];

const union = (ranges: Array<Range | undefined>): Range | undefined =>
  ranges.reduce<Range | undefined>(
    (all, range) => (range ? (all ? [Math.min(all[0], range[0]), Math.max(all[1], range[1])] : range) : all),
    undefined,
  );

/**
 * Stamps each element with `dataSource="start:end"`, its offsets in the slide's own markdown; an element
 * synthesized by the parser (a click group) spans its children.
 */
const markSource = (node: HastContent, toSource: (offset: number) => number): Range | undefined => {
  const own: Range | undefined =
    node.position?.start.offset !== undefined && node.position.end.offset !== undefined
      ? [toSource(node.position.start.offset), toSource(node.position.end.offset)]
      : undefined;
  if (node.type !== 'element') {
    return own;
  }
  const range = union([own, ...node.children.map((child) => markSource(child, toSource))]);
  if (range) {
    node.properties.dataSource = `${range[0]}:${range[1]}`;
  }
  return range;
};

/** The `start:end` source range stamped on a rendered element, if any. */
export const parseSourceRange = (value: unknown): Range | undefined => {
  const match = typeof value === 'string' ? /^(\d+):(\d+)$/.exec(value) : null;
  return match ? [Number(match[1]), Number(match[2])] : undefined;
};

const contains = (range: Range | undefined, offset: number) =>
  range !== undefined && offset >= range[0] && offset <= range[1];

/**
 * The click step that reveals the source at `offset`: the largest step among the elements around it (0 when
 * none is stepped).
 */
export const stepAtOffset = (slide: ParsedSlide, offset: number): number => {
  const visit = (node: HastContent): number => {
    if (node.type !== 'element' || !contains(parseSourceRange(node.properties.dataSource), offset)) {
      return 0;
    }
    const own = node.properties.step === undefined ? 0 : Number(node.properties.step);
    return Math.max(own, ...node.children.map(visit));
  };
  return Math.max(0, ...Object.values(slide.slots).flatMap((root) => root.children.map(visit)));
};

/**
 * The slot whose content holds `offset`, for layouts with more than one slot.
 */
export const slotAtOffset = (slide: ParsedSlide, offset: number): SlotName | undefined =>
  SLOTS.find((slot) =>
    contains(
      union(
        slide.slots[slot].children.map((child) =>
          child.type === 'element' ? parseSourceRange(child.properties.dataSource) : undefined,
        ),
      ),
      offset,
    ),
  );

/**
 * The deck theme named by a first slide's headmatter, if it is a built-in theme.
 */
export const parseHeadmatterTheme = (content: string): SlideTheme.Name | undefined => {
  const { theme } = parseSlide(content).frontmatter;
  return SlideTheme.isName(theme) ? theme : undefined;
};
