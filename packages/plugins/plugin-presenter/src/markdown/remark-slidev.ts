//
// Copyright 2026 DXOS.org
//

import type { Properties } from 'hast';
import type { Data, Html, Paragraph, Parent, Root, RootContent, Text } from 'mdast';

import { EID } from '@dxos/keys';

import { type SlideIssue } from './frontmatter.ts';

/** Content regions of a slide, selected by `::name::` markers. */
export const SLOTS = ['default', 'left', 'middle', 'right', 'bottom-left', 'bottom-right'] as const;

export type SlotName = (typeof SLOTS)[number];

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
} as const;

type ContainerTag = keyof typeof CONTAINER_TAGS;

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
          top().children.push(containerElement(frame.open, frame.children, issues));
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

const containerElement = (
  open: Extract<Token, { kind: 'open' }>,
  children: RootContent[],
  issues: SlideIssue[],
): SlideElement => {
  const hName = CONTAINER_TAGS[open.tag];
  if (open.tag !== 'v-clicks') {
    return slideElement(hName, {}, children);
  }
  const depth = positiveInteger(open.attributes.depth, 'depth', issues);
  const every = positiveInteger(open.attributes.every, 'every', issues);
  return slideElement(hName, { depth, every }, children);
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
