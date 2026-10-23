//
// Copyright 2026 DXOS.org
//

import type { Root as HastRoot } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { SlideTheme } from '#types';

import { type LayoutName, LAYOUTS, type SlideFrontmatter, type SlideIssue, parseFrontmatter } from './frontmatter.ts';
import { type SlotName, remarkSlidev } from './remark-slidev.ts';
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
  const tree = markdownProcessor.runSync(markdownProcessor.parse(isolateSlotMarkers(content)));
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

  const toHast = (slot: SlotName): HastRoot =>
    hastProcessor.runSync(slidev?.slots[slot] ?? { type: 'root', children: [] });

  return {
    frontmatter,
    layout,
    slots: { default: toHast('default'), left: toHast('left'), right: toHast('right') },
    notes: slidev?.notes,
    clicks: slidev?.clicks ?? 0,
    issues,
  };
};

/**
 * The deck theme named by a first slide's headmatter, if it is a built-in theme.
 */
export const parseHeadmatterTheme = (content: string): SlideTheme.Name | undefined => {
  const { theme } = parseSlide(content).frontmatter;
  return SlideTheme.isName(theme) ? theme : undefined;
};
