//
// Copyright 2026 DXOS.org
//

import type { Element, Root, RootContent } from 'hast';
import { describe, expect, test } from 'vitest';

import { parseSlide } from './parse.ts';

type HastNode = Root | RootContent;

const textOf = (node: HastNode): string => {
  if (node.type === 'text') {
    return node.value;
  }
  return 'children' in node ? node.children.map(textOf).join('') : '';
};

const elements = (node: HastNode, tagName: string): Element[] => {
  const found: Element[] = node.type === 'element' && node.tagName === tagName ? [node] : [];
  return 'children' in node ? [...found, ...node.children.flatMap((child) => elements(child, tagName))] : found;
};

describe('parseSlide', () => {
  test('plain markdown renders into the default slot', () => {
    const slide = parseSlide('# Title\n\nSome **bold** text.');
    expect(slide.layout).toBe('default');
    expect(slide.clicks).toBe(0);
    expect(slide.issues).toEqual([]);
    expect(elements(slide.slots.default, 'h1')).toHaveLength(1);
    expect(textOf(slide.slots.default)).toContain('Some bold text.');
  });

  test('gfm tables are parsed', () => {
    const slide = parseSlide('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(elements(slide.slots.default, 'table')).toHaveLength(1);
  });

  test('notes are extracted and absent from slots', () => {
    const slide = parseSlide('# Title\n\nBody\n\n<!--\nSpeaker notes here.\n-->');
    expect(slide.notes).toBe('Speaker notes here.');
    expect(textOf(slide.slots.default)).not.toContain('Speaker notes');
    expect(slide.issues).toEqual([]);
  });

  test('a comment that is not trailing is not notes', () => {
    const slide = parseSlide('<!-- hidden -->\n\n# Title');
    expect(slide.notes).toBeUndefined();
    expect(textOf(slide.slots.default)).not.toContain('hidden');
  });

  test('::right:: splits into default and right', () => {
    const slide = parseSlide('---\nlayout: two-cols\n---\n# Left\n\nleft text\n\n::right::\n\nright text');
    expect(slide.layout).toBe('two-cols');
    expect(textOf(slide.slots.default)).toContain('left text');
    expect(textOf(slide.slots.default)).not.toContain('right text');
    expect(textOf(slide.slots.right)).toContain('right text');
    expect(textOf(slide.slots.right)).not.toContain('::right::');
    expect(slide.slots.left.children).toEqual([]);
  });

  test('::left:: and ::default:: route content', () => {
    const slide = parseSlide('# Header\n\n::left::\n\nL\n\n::right::\n\nR\n\n::default::\n\nD');
    expect(textOf(slide.slots.default)).toContain('Header');
    expect(textOf(slide.slots.default)).toContain('D');
    expect(textOf(slide.slots.left)).toBe('L');
    expect(textOf(slide.slots.right)).toBe('R');
  });

  test('<v-clicks> over a 3-item list assigns steps 1..3', () => {
    const slide = parseSlide('<v-clicks>\n\n- a\n- b\n- c\n\n</v-clicks>');
    expect(slide.clicks).toBe(3);
    const [wrapper] = elements(slide.slots.default, 'slide-clicks');
    expect(wrapper).toBeDefined();
    expect(elements(wrapper, 'li').map((item) => item.properties.step)).toEqual(['1', '2', '3']);
    expect(slide.issues).toEqual([]);
  });

  test('<v-clicks every> groups items', () => {
    const slide = parseSlide('<v-clicks every="2">\n\n- a\n- b\n- c\n\n</v-clicks>');
    expect(slide.clicks).toBe(2);
    expect(elements(slide.slots.default, 'li').map((item) => item.properties.step)).toEqual(['1', '1', '2']);
    expect(elements(slide.slots.default, 'slide-clicks')[0].properties.every).toBe(2);
  });

  test('<v-clicks depth> reveals nested items', () => {
    const markdown = '<v-clicks depth="2">\n\n- a\n  - a1\n- b\n\n</v-clicks>';
    const slide = parseSlide(markdown);
    expect(slide.clicks).toBe(3);
    expect(elements(slide.slots.default, 'li').map((item) => item.properties.step)).toEqual(['1', '2', '3']);

    const shallow = parseSlide(markdown.replace(' depth="2"', ''));
    expect(shallow.clicks).toBe(2);
  });

  test('<v-after> shares the previous step', () => {
    const slide = parseSlide('<v-click>First</v-click>\n\n<v-after>Second</v-after>\n\n<v-click>Third</v-click>');
    expect(slide.clicks).toBe(2);
    const steps = [...elements(slide.slots.default, 'slide-click'), ...elements(slide.slots.default, 'slide-after')]
      .map((element) => [textOf(element), element.properties.step])
      .sort();
    expect(steps).toEqual([
      ['First', '1'],
      ['Second', '1'],
      ['Third', '2'],
    ]);
  });

  test('inline <v-click> keeps formatting inside', () => {
    const slide = parseSlide('Before <v-click>a **b**</v-click> after');
    const [click] = elements(slide.slots.default, 'slide-click');
    expect(elements(click, 'strong')).toHaveLength(1);
    expect(textOf(slide.slots.default)).toBe('Before a b after');
  });

  test('<Surface ref /> becomes a slide-surface element', () => {
    const slide = parseSlide('<Surface ref="echo:///A" />');
    const surfaces = elements(slide.slots.default, 'slide-surface');
    expect(surfaces).toHaveLength(1);
    expect(surfaces[0].properties).toMatchObject({ ref: 'echo:///A', role: 'slide' });
    expect(slide.issues).toEqual([]);
  });

  test('<Surface> with an invalid role defaults to slide', () => {
    const slide = parseSlide('<Surface ref="echo:///A" role="banner" />');
    expect(elements(slide.slots.default, 'slide-surface')[0].properties.role).toBe('slide');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['html']);
  });

  test('<br> is allowed', () => {
    const slide = parseSlide('a<br>b<br/>c');
    expect(elements(slide.slots.default, 'br')).toHaveLength(2);
    expect(slide.issues).toEqual([]);
  });

  test('<script> is escaped text and reported', () => {
    const slide = parseSlide('<script>alert(1)</script>');
    expect(elements(slide.slots.default, 'script')).toEqual([]);
    expect(textOf(slide.slots.default)).toContain('<script>alert(1)</script>');
    expect(slide.issues.map((issue) => issue.kind)).toContain('html');
  });

  test('<img onerror> is escaped text and reported', () => {
    const slide = parseSlide('Look <img src=x onerror="alert(1)"> here');
    expect(elements(slide.slots.default, 'img')).toEqual([]);
    expect(textOf(slide.slots.default)).toContain('<img src=x onerror="alert(1)">');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['html']);
  });

  test('<iframe> block is escaped text', () => {
    const slide = parseSlide('<iframe src="https://example.com"></iframe>');
    expect(elements(slide.slots.default, 'iframe')).toEqual([]);
    expect(textOf(slide.slots.default)).toContain('<iframe');
    expect(slide.issues.map((issue) => issue.kind)).toContain('html');
  });

  test('unmatched <v-click> is escaped text and reported', () => {
    const slide = parseSlide('Hello <v-click>world');
    expect(elements(slide.slots.default, 'slide-click')).toEqual([]);
    expect(textOf(slide.slots.default)).toBe('Hello <v-click>world');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['html']);
    expect(slide.clicks).toBe(0);
  });

  test('stray closing tag is escaped text and reported', () => {
    const slide = parseSlide('Hello</v-click>');
    expect(textOf(slide.slots.default)).toBe('Hello</v-click>');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['html']);
  });

  test('inline <v-clicks> gives the counted click a stepped element', () => {
    const slide = parseSlide('x <v-clicks>a b</v-clicks> y');
    expect(slide.clicks).toBe(1);
    const stepped = elements(slide.slots.default, 'span').filter((element) => element.properties.step !== undefined);
    expect(stepped.map((element) => [textOf(element), element.properties.step])).toEqual([['a b', '1']]);
  });

  test('<Surface> with an invalid ref keeps the element and reports it', () => {
    const slide = parseSlide('<Surface ref="javascript:alert(1)" />');
    expect(elements(slide.slots.default, 'slide-surface')).toHaveLength(1);
    expect(slide.issues).toEqual([{ kind: 'html', message: expect.stringContaining('invalid object reference') }]);
  });

  test('a non-trailing comment is dropped without an issue', () => {
    const slide = parseSlide('# Title\n\n<!-- hidden -->\n\nBody');
    expect(textOf(slide.slots.default)).not.toContain('hidden');
    expect(slide.notes).toBeUndefined();
    expect(slide.issues).toEqual([]);
  });

  test('<svg/onload> stays text', () => {
    const slide = parseSlide('Hi <svg/onload=alert(1)> there');
    expect(elements(slide.slots.default, 'svg')).toEqual([]);
    expect(textOf(slide.slots.default)).toContain('<svg/onload=alert(1)>');
    // CommonMark needs whitespace before attributes, so this is plain text and never reaches the HTML rewrite.
    expect(slide.issues).toEqual([]);
  });

  test.each([
    ['link', '[x](javascript:alert(1))'],
    ['autolink', '<javascript:alert(1)>'],
    ['reference link', '[x][d]\n\n[d]: javascript:alert(1)'],
    ['data:text/html link', '[x](data:text/html,<script>alert(1)</script>)'],
    ['obfuscated scheme', '[x](JaVa&#x09;Script:alert(1))'],
  ])('unsafe %s href is removed', (_, markdown) => {
    const slide = parseSlide(markdown);
    const links = elements(slide.slots.default, 'a');
    expect(links).toHaveLength(1);
    expect(links[0].properties.href).toBe('');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['html']);
  });

  test.each([
    ['javascript:', '![x](javascript:alert(1))'],
    ['data:text/html', '![x](data:text/html;base64,PHNjcmlwdD4=)'],
  ])('unsafe %s image src is removed', (_, markdown) => {
    const slide = parseSlide(markdown);
    expect(elements(slide.slots.default, 'img')[0].properties.src).toBe('');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['html']);
  });

  test('safe URLs are kept', () => {
    const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    const slide = parseSlide(
      `[a](https://dxos.org) [b](mailto:a@b.c) [c](#top) [d](./doc) [e](echo:///A)\n\n![i](${svg})`,
    );
    expect(elements(slide.slots.default, 'a').map((link) => link.properties.href)).toEqual([
      'https://dxos.org',
      'mailto:a@b.c',
      '#top',
      './doc',
      'echo:///A',
    ]);
    expect(elements(slide.slots.default, 'img')[0].properties.src).toBe(svg);
    expect(slide.issues).toEqual([]);
  });

  test('data:image is not allowed as a link href', () => {
    const slide = parseSlide('[x](data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=)');
    expect(elements(slide.slots.default, 'a')[0].properties.href).toBe('');
  });

  test('malformed frontmatter keeps the body intact', () => {
    const slide = parseSlide('---\nlayout: [unclosed\n---\n# Body');
    expect(slide.frontmatter).toEqual({});
    expect(slide.layout).toBe('default');
    expect(textOf(slide.slots.default)).toBe('Body');
    expect(slide.issues.map((issue) => issue.kind)).toEqual(['frontmatter']);
  });

  test('frontmatter is parsed and not rendered', () => {
    const slide = parseSlide('---\nlayout: cover\ntitle: Hello\n---\n# Body');
    expect(slide.frontmatter).toEqual({ layout: 'cover', title: 'Hello' });
    expect(slide.layout).toBe('cover');
    expect(textOf(slide.slots.default)).toBe('Body');
  });

  test('unknown layout falls back to default with an issue', () => {
    const slide = parseSlide('---\nlayout: nope\n---\n# Body');
    expect(slide.layout).toBe('default');
    expect(slide.issues).toEqual([{ kind: 'layout', message: expect.stringContaining('nope') }]);
  });

  test('slot markers are line-based, with or without blank lines', () => {
    const slide = parseSlide('# A\n::right::\nB');
    expect(textOf(slide.slots.default)).toBe('A');
    expect(textOf(slide.slots.right)).toBe('B');
    expect(textOf(slide.slots.default)).not.toContain('::');
  });

  test('a slot marker inside a fenced code block is code', () => {
    const slide = parseSlide('```\n::right::\n```');
    expect(textOf(slide.slots.default)).toContain('::right::');
    expect(textOf(slide.slots.right)).toBe('');
  });

  test('only known slot names are markers', () => {
    const slide = parseSlide('# A\n::note::\nB');
    expect(textOf(slide.slots.default)).toContain('::note::');
    expect(textOf(slide.slots.right)).toBe('');
  });

  test('a marker inside a list item does not end the list', () => {
    const slide = parseSlide('- one\n  ::right::\n  two\n- three');
    expect(elements(slide.slots.default, 'ul')).toHaveLength(1);
    expect(elements(slide.slots.default, 'li')).toHaveLength(2);
    expect(textOf(slide.slots.right)).toBe('');
  });

  test('a marker indented four spaces is code, not a marker', () => {
    const slide = parseSlide('# A\n\n    ::right::\n\nB');
    expect(textOf(slide.slots.right)).toBe('');
    expect(textOf(slide.slots.default)).toContain('::right::');
  });
});
