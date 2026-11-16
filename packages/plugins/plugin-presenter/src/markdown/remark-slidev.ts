//
// Copyright 2026 DXOS.org
//

import type { Properties } from 'hast';
import type { Data, Html, Paragraph, Parent, Root, RootContent, Text } from 'mdast';

import { EID } from '@dxos/keys';

import { SlideTheme } from '#types';

import { type SlideIssue } from './frontmatter.ts';

/** Content regions of a slide, selected by `::name::` markers. */
export const SLOTS = ['default', 'left', 'middle', 'right', 'bottom-left', 'bottom-right'] as const;

export type SlotName = (typeof SLOTS)[number];

/** Named list styles a `<List>` may request; the first is the plain markdown list. */
export const LIST_VARIANTS = ['default', 'cards', 'steps', 'outline', 'flow'] as const;

export type ListVariant = (typeof LIST_VARIANTS)[number];

/** Named box styles a `<Box>` may request; the first is an undecorated container. */
export const BOX_VARIANTS = ['default', 'card', 'outline', 'hero', 'watermark', 'art'] as const;

export type BoxVariant = (typeof BOX_VARIANTS)[number];

/** Named card styles a `<Card>` may request; the first is a filled surface, as the brand's own cards are. */
export const CARD_VARIANTS = ['default', 'outline', 'plain'] as const;

export type CardVariant = (typeof CARD_VARIANTS)[number];

/** The widest grid, and the furthest a cell may span: a slide holds no more legibly. */
export const MAX_TRACKS = 12;

/** Named table styles a `<Table>` may request; the first is the plain markdown table. */
export const TABLE_VARIANTS = ['default', 'rows', 'cards', 'outline'] as const;

export type TableVariant = (typeof TABLE_VARIANTS)[number];

/** Roles a `<Surface>` may request; the first is the default. */
export const SURFACE_ROLES = ['slide', 'section', 'card'] as const;

export type SurfaceRole = (typeof SURFACE_ROLES)[number];

/** An allowlisted Slidev/DXOS tag, converted to a hast element by `remark-rehype` via `data.hName`. */
export interface SlideElement extends Parent {
  type: 'slideElement';
  data: Data & { hName: string; hProperties: Properties };
}

/** Results of `remarkSlidev`, attached to the root's `data.slidev`. */
export type SlidevData = {
  /** Raw YAML of the slide's frontmatter block, without delimiters. */
  frontmatter?: string;
  notes?: string;
  clicks: number;
  issues: SlideIssue[];
  slots: Record<SlotName, Root>;
};

declare module 'mdast' {
  interface RootContentMap {
    slideElement: SlideElement;
  }
  interface BlockContentMap {
    slideElement: SlideElement;
  }
  interface PhrasingContentMap {
    slideElement: SlideElement;
  }
  interface RootData {
    slidev?: SlidevData;
  }
}

const CONTAINER_TAGS = {
  'v-click': 'slide-click',
  'v-clicks': 'slide-clicks',
  'v-after': 'slide-after',
  // A style tag leaves no element of its own; it names a style for the block it wraps (see `STYLE_TAGS`).
  'list': '',
  'table': '',
  // `<Box>` is the one style tag with an element of its own: it wraps whatever it holds.
  'box': 'slide-box',
  // Layout tags, each an element of its own: a grid of tracks, a cell spanning them, and a card to fill one.
  'grid': 'slide-grid',
  'cell': 'slide-cell',
  'card': 'slide-card',
} as const;

type ContainerTag = keyof typeof CONTAINER_TAGS;

/** The tags that style the block they wrap: the mdast node each one looks for, and the variants it takes. */
const STYLE_TAGS = {
  list: { node: 'list', variants: LIST_VARIANTS as readonly string[] },
  table: { node: 'table', variants: TABLE_VARIANTS as readonly string[] },
} as const;

type StyleTag = keyof typeof STYLE_TAGS;

const isStyleTag = (tag: ContainerTag): tag is StyleTag => Object.hasOwn(STYLE_TAGS, tag);

/**
 * The tone a style tag asks for, or none when it asks for no tone: an untoned block inherits the tone of the block
 * around it, while `tone="accent"` is a request to return to the slide's own accent. An unknown name falls back.
 */
const toneName = (tag: ContainerTag, value: string | undefined, issues: SlideIssue[]): SlideTheme.Tone | undefined => {
  if (value === undefined || SlideTheme.isTone(value)) {
    return value;
  }
  issues.push({
    kind: 'html',
    message: `Invalid ${tagLabel(tag)} tone "${value}"; using "${SlideTheme.TONES[0]}".`,
  });
  return SlideTheme.TONES[0];
};

/** A tag's name as it is written, for an issue message. */
const tagLabel = (tag: ContainerTag): string => `<${tag[0].toUpperCase()}${tag.slice(1)}>`;

/** The requested variant, or the first (plain) one when it is not a name this tag knows. */
const variantName = (
  tag: ContainerTag,
  value: string | undefined,
  variants: readonly string[],
  issues: SlideIssue[],
): string => {
  const variant = value ?? variants[0];
  if (variants.includes(variant)) {
    return variant;
  }
  issues.push({
    kind: 'html',
    message: `Invalid ${tagLabel(tag)} variant "${variant}"; using "${variants[0]}".`,
  });
  return variants[0];
};

// Parents whose children are inline, so escaped HTML stays a bare text node instead of a paragraph.
const PHRASING_PARENTS = new Set([
  'paragraph',
  'heading',
  'emphasis',
  'strong',
  'delete',
  'link',
  'linkReference',
  'tableCell',
]);

const COMMENT = /^<!--((?:(?!-->)[\s\S])*)-->$/;
const TAG = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][A-Za-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE = /([A-Za-z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
export const SLOT_MARKER = /^::([a-z]+(?:-[a-z]+)*)::$/;
const URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'echo']);
const DATA_IMAGE = /^data:image\//i;

type Token =
  | { kind: 'open'; tag: ContainerTag; attributes: Record<string, string>; raw: string }
  | { kind: 'close'; tag: ContainerTag; raw: string }
  | { kind: 'node'; node: RootContent };

const isContainerTag = (name: string): name is ContainerTag => Object.hasOwn(CONTAINER_TAGS, name);

export const isSlotName = (name: string): name is SlotName => SLOTS.some((slot) => slot === name);

const isSurfaceRole = (role: string): role is SurfaceRole => SURFACE_ROLES.some((value) => value === role);

const isSlideElement = (node: RootContent): node is SlideElement => node.type === 'slideElement';

const parseAttributes = (source: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(ATTRIBUTE)) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
};

/**
 * True for relative/fragment URLs and allowlisted schemes; `data:image/*` and `blob:` only where it is an image source
 * (an object URL is minted by this origin, e.g. for a stored file, and an image cannot run script).
 */
export const isSafeUrl = (url: string, image: boolean): boolean => {
  // Browsers ignore control characters and spaces when reading a scheme, so `java\tscript:` must not slip past.
  const normalized = [...url].filter((char) => char.charCodeAt(0) > 0x20 && char.charCodeAt(0) !== 0x7f).join('');
  const scheme = URL_SCHEME.exec(normalized)?.[1];
  if (scheme === undefined) {
    return true;
  }
  return (
    SAFE_SCHEMES.has(scheme.toLowerCase()) ||
    (image && (DATA_IMAGE.test(normalized) || scheme.toLowerCase() === 'blob'))
  );
};

const sanitizeUrl = (node: RootContent, issues: SlideIssue[]) => {
  if (
    (node.type === 'link' || node.type === 'definition' || node.type === 'image') &&
    !isSafeUrl(node.url, node.type === 'image')
  ) {
    issues.push({ kind: 'html', message: `Unsafe URL removed: ${node.url}` });
    node.url = '';
  }
};

const slideElement = (hName: string, hProperties: Properties, children: RootContent[] = []): SlideElement => ({
  type: 'slideElement',
  children,
  data: { hName, hProperties },
});

const setStep = (node: RootContent, step: number) => {
  node.data = { ...node.data, hProperties: { ...node.data?.hProperties, step: String(step) } };
};

/**
 * Transforms the HTML, slot markers, notes and frontmatter of one slide's mdast; the `data.slidev` it attaches is
 * read by `parseSlide` and is the plugin's only output. Raw HTML outside the allowlist becomes text so it is shown,
 * never executed.
 */
export const remarkSlidev = () => (tree: Root) => {
  tree.data = { ...tree.data, slidev: transformSlide(tree) };
};

const transformSlide = (tree: Root): SlidevData => {
  const issues: SlideIssue[] = [];

  const [first] = tree.children;
  const frontmatter = first?.type === 'yaml' ? first.value : undefined;
  const children = first?.type === 'yaml' ? tree.children.slice(1) : [...tree.children];

  let notes: string | undefined;
  const last = children.at(-1);
  const comment = last?.type === 'html' ? COMMENT.exec(last.value.trim()) : null;
  if (comment) {
    notes = comment[1].trim();
    children.pop();
  }

  const body: Root = { type: 'root', children };
  transformChildren(body, issues);
  const clicks = assignSteps(body.children, 0);

  const slots: Record<SlotName, Root> = {
    'default': { type: 'root', children: [] },
    'left': { type: 'root', children: [] },
    'middle': { type: 'root', children: [] },
    'right': { type: 'root', children: [] },
    'bottom-left': { type: 'root', children: [] },
    'bottom-right': { type: 'root', children: [] },
  };
  let slot: SlotName = 'default';
  for (const node of body.children) {
    const name = slotMarker(node);
    if (name) {
      slot = name;
    } else {
      slots[slot].children.push(node);
    }
  }

  return { frontmatter, notes, clicks, issues, slots };
};

const slotMarker = (node: RootContent): SlotName | undefined => {
  if (node.type !== 'paragraph' || node.children.length !== 1 || node.children[0].type !== 'text') {
    return undefined;
  }
  const name = SLOT_MARKER.exec(node.children[0].value.trim())?.[1];
  return name !== undefined && isSlotName(name) ? name : undefined;
};

const OBJECT_URI = /^(echo|eid):/i;

/**
 * `![label](echo:///<id>)` embeds the object like `<Surface ref>`; an image alone in its paragraph replaces the
 * paragraph, so the surface can fill its slot.
 */
const objectEmbed = (node: RootContent): SlideElement | undefined => {
  if (node.type === 'image' && OBJECT_URI.test(node.url)) {
    return slideElement('slide-surface', { ref: node.url, role: SURFACE_ROLES[0] });
  }
  if (node.type === 'paragraph') {
    const content = node.children.filter((child) => child.type !== 'text' || child.value.trim().length > 0);
    return content.length === 1 ? objectEmbed(content[0]) : undefined;
  }
  return undefined;
};

/** Rewrites raw HTML in `parent` (bottom-up) into allowlisted elements or escaped text. */
const transformChildren = (parent: Parent, issues: SlideIssue[]) => {
  parent.children = parent.children.map((child) => objectEmbed(child) ?? child);
  for (const child of parent.children) {
    sanitizeUrl(child, issues);
    if ('children' in child) {
      transformChildren(child, issues);
    }
  }

  const phrasing = PHRASING_PARENTS.has(parent.type);
  const escaped = (value: string): RootContent => {
    const text: Text = { type: 'text', value };
    const paragraph: Paragraph = { type: 'paragraph', children: [text] };
    return phrasing ? text : paragraph;
  };

  const tokens = parent.children.flatMap((child) =>
    child.type === 'html' ? tokenize(child, phrasing, escaped, issues) : [{ kind: 'node' as const, node: child }],
  );
  if (tokens.length === parent.children.length && tokens.every((token) => token.kind === 'node')) {
    parent.children = tokens.map((token) => token.node);
    return;
  }

  type Frame = { open?: Extract<Token, { kind: 'open' }>; children: RootContent[] };
  const stack: Frame[] = [{ children: [] }];
  const top = () => stack[stack.length - 1];
  for (const token of tokens) {
    switch (token.kind) {
      case 'node': {
        top().children.push(token.node);
        break;
      }
      case 'open': {
        stack.push({ open: token, children: [] });
        break;
      }
      case 'close': {
        const frame = top();
        if (frame.open?.tag === token.tag) {
          stack.pop();
          top().children.push(...containerNodes(frame.open, frame.children, issues));
        } else {
          issues.push({ kind: 'html', message: `Unmatched closing tag: ${token.raw}` });
          top().children.push(escaped(token.raw));
        }
        break;
      }
    }
  }

  while (stack.length > 1) {
    const frame = stack.pop();
    if (frame?.open) {
      issues.push({ kind: 'html', message: `Unclosed tag: ${frame.open.raw}` });
      top().children.push(escaped(frame.open.raw), ...frame.children);
    }
  }

  parent.children = stack[0].children;
};

const tokenize = (
  node: Html,
  phrasing: boolean,
  escaped: (value: string) => RootContent,
  issues: SlideIssue[],
): Token[] => {
  const tokens: Token[] = [];
  let pending = '';
  let disallowed = false;
  const flush = () => {
    if (phrasing ? pending.length > 0 : pending.trim().length > 0) {
      tokens.push({ kind: 'node', node: escaped(phrasing ? pending : pending.trim()) });
    }
    pending = '';
  };

  let index = 0;
  for (const match of node.value.matchAll(TAG)) {
    pending += node.value.slice(index, match.index);
    index = match.index + match[0].length;
    const [raw, closing, rawName, attributes] = match;
    if (rawName === undefined) {
      // Comments render nothing in a browser either.
      continue;
    }

    const name = rawName.toLowerCase();
    const selfClosing = attributes?.trimEnd().endsWith('/') ?? false;
    if (isContainerTag(name) && !selfClosing) {
      flush();
      tokens.push(
        closing
          ? { kind: 'close', tag: name, raw }
          : { kind: 'open', tag: name, attributes: parseAttributes(attributes ?? ''), raw },
      );
    } else if (name === 'br' && !closing) {
      flush();
      tokens.push({ kind: 'node', node: slideElement('br', {}) });
    } else if (name === 'surface' && !closing) {
      flush();
      tokens.push({ kind: 'node', node: surfaceElement(parseAttributes(attributes ?? ''), issues) });
    } else {
      disallowed = true;
      pending += raw;
    }
  }
  pending += node.value.slice(index);
  flush();

  if (disallowed) {
    issues.push({ kind: 'html', message: `Raw HTML is not rendered: ${node.value}` });
  }
  return tokens;
};

const surfaceElement = (attributes: Record<string, string>, issues: SlideIssue[]): SlideElement => {
  const ref = attributes.ref;
  if (!ref) {
    issues.push({ kind: 'html', message: '<Surface> requires a ref attribute.' });
  } else if (EID.tryParse(ref) === undefined) {
    issues.push({ kind: 'html', message: `<Surface> has an invalid object reference: ${ref}` });
  }
  const requested = attributes.role ?? SURFACE_ROLES[0];
  if (!isSurfaceRole(requested)) {
    issues.push({ kind: 'html', message: `Invalid <Surface> role "${requested}"; using "${SURFACE_ROLES[0]}".` });
  }
  const role: SurfaceRole = isSurfaceRole(requested) ? requested : SURFACE_ROLES[0];
  return slideElement('slide-surface', { ref: ref ?? '', role });
};

const positiveInteger = (value: string | undefined, name: string, issues: SlideIssue[]): number => {
  if (value === undefined) {
    return 1;
  }
  const number = Number(value);
  if (Number.isInteger(number) && number >= 1) {
    return number;
  }
  issues.push({ kind: 'html', message: `Invalid <v-clicks> ${name} "${value}"; using 1.` });
  return 1;
};

/**
 * `<List>` and `<Table>` style the block they wrap and contribute no element, so a styled list is still a `<ul>` and
 * a styled table still a `<table>`; the variant travels on the node for the renderer to turn into classes.
 */
/** The 1-based item a list marks as the one in hand (`<List active="3">`), or none. */
const activeItem = (tag: ContainerTag, value: string | undefined, issues: SlideIssue[]): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const item = Number(value);
  if (Number.isInteger(item) && item >= 1) {
    return item;
  }
  issues.push({ kind: 'html', message: `Invalid ${tagLabel(tag)} active "${value}"; ignored.` });
  return undefined;
};

const styleBlocks = (
  tag: StyleTag,
  children: RootContent[],
  attributes: Record<string, string>,
  issues: SlideIssue[],
): RootContent[] => {
  const { node, variants } = STYLE_TAGS[tag];
  const variant = variantName(tag, attributes.variant, variants, issues);
  const tone = toneName(tag, attributes.tone, issues);
  const active = activeItem(tag, attributes.active, issues);
  const blocks = children.filter((child) => child.type === node);
  if (blocks.length === 0) {
    issues.push({ kind: 'html', message: `${tagLabel(tag)} has no ${node} to style.` });
  }
  for (const block of blocks) {
    block.data = {
      ...block.data,
      hProperties: { ...block.data?.hProperties, variant, ...(tone && { tone }), ...(active && { active }) },
    };
  }
  return children;
};

/**
 * A count of grid tracks: how many a `<Grid>` lays down, or how many a cell spans. Bounded by {@link MAX_TRACKS}, and
 * absent when the tag does not ask for one, so the theme's own default applies.
 */
const trackCount = (
  tag: ContainerTag,
  name: string,
  value: string | undefined,
  issues: SlideIssue[],
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const count = Number(value);
  if (Number.isInteger(count) && count >= 1 && count <= MAX_TRACKS) {
    return count;
  }
  issues.push({
    kind: 'html',
    message: `Invalid ${tagLabel(tag)} ${name} "${value}"; 1 to ${MAX_TRACKS} expected, ignored.`,
  });
  return undefined;
};

/** The tracks a `<Grid>` lays down. */
const gridProperties = (tag: ContainerTag, attributes: Record<string, string>, issues: SlideIssue[]): Properties => {
  const cols = trackCount(tag, 'cols', attributes.cols, issues);
  const rows = trackCount(tag, 'rows', attributes.rows, issues);
  return { ...(cols && { cols }), ...(rows && { rows }) };
};

/**
 * The tracks a grid's child covers, as `colSpan`/`rowSpan` — named as the table attributes and CSS's
 * `grid-column: span n` are, so a count of tracks laid down never reads the same as a count of tracks covered.
 */
const spanProperties = (tag: ContainerTag, attributes: Record<string, string>, issues: SlideIssue[]): Properties => {
  const colSpan = trackCount(tag, 'colSpan', attributes.colSpan, issues);
  const rowSpan = trackCount(tag, 'rowSpan', attributes.rowSpan, issues);
  return { ...(colSpan && { colSpan }), ...(rowSpan && { rowSpan }) };
};

const containerNodes = (
  open: Extract<Token, { kind: 'open' }>,
  children: RootContent[],
  issues: SlideIssue[],
): RootContent[] => {
  if (open.tag === 'grid' || open.tag === 'cell') {
    // Neither takes a named style, but both carry the only one they have so the renderer finds their classes where
    // every other tag's live.
    const tracks =
      open.tag === 'grid'
        ? gridProperties(open.tag, open.attributes, issues)
        : spanProperties(open.tag, open.attributes, issues);
    return [slideElement(CONTAINER_TAGS[open.tag], { variant: 'default', ...tracks }, children)];
  }
  if (open.tag === 'box' || open.tag === 'card') {
    const variants = open.tag === 'box' ? BOX_VARIANTS : CARD_VARIANTS;
    const variant = variantName(open.tag, open.attributes.variant, variants, issues);
    const tone = toneName(open.tag, open.attributes.tone, issues);
    // A card is a grid child as often as not, so it takes a span of its own rather than needing a `<Cell>` around it.
    const tracks = open.tag === 'card' ? spanProperties(open.tag, open.attributes, issues) : {};
    return [slideElement(CONTAINER_TAGS[open.tag], { variant, ...(tone && { tone }), ...tracks }, children)];
  }
  if (isStyleTag(open.tag)) {
    return styleBlocks(open.tag, children, open.attributes, issues);
  }
  const hName = CONTAINER_TAGS[open.tag];
  if (open.tag !== 'v-clicks') {
    return [slideElement(hName, {}, children)];
  }
  const depth = positiveInteger(open.attributes.depth, 'depth', issues);
  const every = positiveInteger(open.attributes.every, 'every', issues);
  return [slideElement(hName, { depth, every }, children)];
};

/** Nodes revealed one by one by `<v-clicks>`: list items down to `depth`, otherwise each child. */
const clickTargets = (children: RootContent[], depth: number, level = 1): RootContent[] =>
  children.flatMap((child) => {
    if (child.type !== 'list') {
      return level === 1 ? [child] : [];
    }
    return child.children.flatMap((item) => [
      item,
      ...(level < depth
        ? clickTargets(
            item.children.filter((node) => node.type === 'list'),
            depth,
            level + 1,
          )
        : []),
    ]);
  });

/** Assigns click steps in document order; returns the last step used. */
const assignSteps = (children: RootContent[], start: number): number => {
  let counter = start;
  for (const node of children) {
    if (isSlideElement(node)) {
      switch (node.data.hName) {
        case 'slide-click': {
          counter += 1;
          node.data.hProperties.step = String(counter);
          break;
        }
        case 'slide-after': {
          node.data.hProperties.step = String(counter);
          break;
        }
        case 'slide-clicks': {
          // Text carries no properties into hast, so inline targets are wrapped to hold their step.
          node.children = node.children.map((child) =>
            child.type === 'text' || child.type === 'break' ? slideElement('span', {}, [child]) : child,
          );
          const { depth, every } = node.data.hProperties;
          const targets = clickTargets(node.children, typeof depth === 'number' ? depth : 1);
          const group = typeof every === 'number' ? every : 1;
          targets.forEach((target, index) => setStep(target, counter + 1 + Math.floor(index / group)));
          counter += Math.ceil(targets.length / group);
          break;
        }
      }
    }
    if ('children' in node) {
      counter = assignSteps(node.children, counter);
    }
  }
  return counter;
};
