//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { SlideThemeProvider } from '../SlideTheme/index.ts';
import { MarkdownSlide, parseLineHighlights, parseLineNumbers } from './MarkdownSlide.tsx';
import { backgroundStyle } from './SlideBackground.tsx';

const render = (content: string, step?: number) =>
  renderToStaticMarkup(<MarkdownSlide content={content} step={step} />);

const clicks = ['<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n');

describe('MarkdownSlide', () => {
  test('a heading reads the color of its level, and the accent where the theme sets none', ({ expect }) => {
    const markup = render('# Title\n\n## Second\n\n### Third');
    const classOf = (tag: string) => markup.match(new RegExp(`<${tag} [^>]*class="([^"]*)"`))?.[1];
    expect(classOf('h1')).toContain('text-[color:var(--slide-heading,var(--slide-accent))]');
    expect(classOf('h2')).toContain('text-[color:var(--slide-subheading,var(--slide-accent))]');
    expect(classOf('h3')).toContain('text-[color:var(--slide-subheading,var(--slide-accent))]');
    // Neither variable is published by a theme that sets no heading color, so the fallback is what paints.
    expect(markup).not.toContain('--slide-heading:');
    expect(markup).not.toContain('--slide-subheading:');
  });

  test('the theme publishes the heading colors it sets', ({ expect }) => {
    const markup = renderToStaticMarkup(
      <SlideThemeProvider settings={{ heading: '#CA6346', subheading: '#336288' }}>
        <MarkdownSlide content={'# Title\n\n## Second'} />
      </SlideThemeProvider>,
    );
    expect(markup).toMatch(/data-slide="true"[^>]*style="[^"]*--slide-heading:#CA6346/);
    expect(markup).toMatch(/data-slide="true"[^>]*style="[^"]*--slide-subheading:#336288/);
  });

  test('a heading in a toned block falls back to the tone, as nothing above it sets its color', ({ expect }) => {
    const markup = render('<Box tone="warning">\n\n## Second\n\n</Box>');
    // The tone rebinds the accent on the block, and the heading under it reads the accent only as its fallback.
    expect(markup).toMatch(
      /data-tone="warning"[^>]*style="[^"]*--slide-accent: ?var\(--color-warning-text\)[^"]*"[^>]*>\s*<h2 [^>]*class="[^"]*var\(--slide-subheading,var\(--slide-accent\)\)/,
    );
    expect(markup).not.toContain('--slide-subheading:');
  });

  test('root carries the default theme variables', ({ expect }) => {
    expect(render('# Title')).toMatch(/data-slide="true"[^>]*style="[^"]*--slide-accent:var\(--color-accent-text\)/);
  });

  test('provider theme forces its color scheme and overrides', ({ expect }) => {
    const markup = renderToStaticMarkup(
      <SlideThemeProvider settings={{ base: 'dark', accent: '#ff0000' }}>
        <MarkdownSlide content='# Title' />
      </SlideThemeProvider>,
    );
    expect(markup).toContain('color-scheme:dark');
    expect(markup).toContain('--slide-accent:#ff0000');
  });

  test('step 0 hides every click item', ({ expect }) => {
    const markup = render(clicks, 0);
    expect(markup.match(/<li[^>]*class="[^"]*invisible/g)).toHaveLength(3);
  });

  test('step 2 shows two of three click items', ({ expect }) => {
    const markup = render(clicks, 2);
    expect(markup.match(/<li[^>]*data-step="\d"/g)).toHaveLength(3);
    expect(markup.match(/<li[^>]*class="[^"]*invisible/g)).toHaveLength(1);
    expect(markup).toMatch(/<li\b(?=[^>]*invisible)(?=[^>]*data-step="3")[^>]*>/);
  });

  test('surfaces in v-clicks carry their step and stay hidden until it', ({ expect }) => {
    const content = [
      '<v-clicks>',
      '',
      '<Surface ref="echo:///A" />',
      '',
      '<Surface ref="echo:///B" />',
      '',
      '</v-clicks>',
    ].join('\n');
    const markup = render(content, 1);
    expect(markup.match(/<div data-embed="echo:\/\/\/[AB]"[^>]*>/g)).toEqual([
      expect.stringMatching(/data-step="1"(?![^>]*invisible)/),
      expect.stringMatching(/data-step="2"[^>]*class="[^"]*invisible/),
    ]);
  });

  test('v-click wrapper is hidden until its step', ({ expect }) => {
    const content = ['<v-click>', '', 'Later', '', '</v-click>'].join('\n');
    expect(render(content, 0)).toMatch(/data-step="1"[^>]*class="[^"]*invisible[^"]*"><p/);
    expect(render(content, 1)).not.toContain('invisible');
  });

  test('two-cols places ::right:: content in the right column', ({ expect }) => {
    const markup = render(
      ['---', 'layout: two-cols', '---', '', 'Left side', '', '::right::', '', 'Right side'].join('\n'),
    );
    expect(markup).toContain('data-layout="two-cols"');
    expect(markup).toMatch(/data-slot="right"[^>]*>(?:(?!data-slot).)*Right side/s);
    expect(markup).toMatch(/data-slot="default"[^>]*>(?:(?!data-slot).)*Left side/s);
  });

  test('bleed: right moves padding off the frame and keeps none on the right column', ({ expect }) => {
    const markup = render(
      ['---', 'layout: two-cols', 'bleed: right', '---', '', 'Left', '', '::right::', '', 'Right'].join('\n'),
    );
    expect(markup).toMatch(/data-layout="two-cols" class="(?![^"]*px-40)[^"]*"/);
    expect(markup).toMatch(/data-slot="default"[^>]*class="[^"]*pl-40[^"]*"/);
    expect(markup).toMatch(/data-slot="right"[^>]*class="(?![^"]*p[rxy]-)[^"]*"/);
  });

  test('three-cols places ::middle:: and ::right:: content in their columns', ({ expect }) => {
    const markup = render(
      ['---', 'layout: three-cols', '---', '', 'One', '', '::middle::', '', 'Two', '', '::right::', '', 'Three'].join(
        '\n',
      ),
    );
    expect(markup).toContain('data-layout="three-cols"');
    expect(markup).toMatch(/data-slot="default"[^>]*>(?:(?!data-slot).)*One/s);
    expect(markup).toMatch(/data-slot="middle"[^>]*>(?:(?!data-slot).)*Two/s);
    expect(markup).toMatch(/data-slot="right"[^>]*>(?:(?!data-slot).)*Three/s);
  });

  test('two-by-two places four regions in reading order', ({ expect }) => {
    const markup = render(
      [
        ['---', 'layout: two-by-two', '---', '', 'One'],
        ['::right::', '', 'Two'],
        ['::bottom-left::', '', 'Three'],
        ['::bottom-right::', '', 'Four'],
      ]
        .map((lines) => lines.join('\n'))
        .join('\n\n'),
    );
    expect(markup).toContain('data-layout="two-by-two"');
    for (const [slot, text] of [
      ['default', 'One'],
      ['right', 'Two'],
      ['bottom-left', 'Three'],
      ['bottom-right', 'Four'],
    ]) {
      expect(markup).toMatch(new RegExp(`data-slot="${slot}"[^>]*>(?:(?!data-slot).)*${text}`, 's'));
    }
  });

  test('code block renders its source inside pre', ({ expect }) => {
    const markup = render(['```ts {2}', 'const a = 1;', 'const b = 2;', '```'].join('\n'));
    expect(markup).toMatch(/<pre[^>]*>(?:(?!<\/pre>).)*const a = 1;(?:(?!<\/pre>).)*<\/pre>/s);
  });

  test('backgroundVideo renders an autoplaying muted looping video', ({ expect }) => {
    const markup = render(['---', 'backgroundVideo: https://example.com/clip.mp4', '---', '', '# Video'].join('\n'));
    expect(markup).toMatch(/<video[^>]*autoplay=""[^>]*muted=""[^>]*loop=""/i);
    expect(markup).toContain('src="https://example.com/clip.mp4"');
  });

  test('raw script is escaped', ({ expect }) => {
    const markup = render('<script>alert(1)</script>');
    expect(markup).not.toContain('<script');
    expect(markup).toContain('&lt;script&gt;');
  });

  test('an unsafe link renders without href or a new-tab target', ({ expect }) => {
    const markup = render('[x](javascript:alert(1))');
    expect(markup).toMatch(/<a[^>]*>x<\/a>/);
    expect(markup).not.toMatch(/<a[^>]*href/);
    expect(markup).not.toMatch(/<a[^>]*target/);
  });

  test('a safe link opens in a new tab', ({ expect }) => {
    expect(render('[x](https://dxos.org)')).toMatch(/<a[^>]*href="https:\/\/dxos.org"[^>]*target="_blank"/);
  });

  test('surface renders a placeholder without a renderer', ({ expect }) => {
    const markup = render('<Surface ref="echo:///01J00000000000000000000000" role="card" />');
    expect(markup).toContain('data-embed="echo:///01J00000000000000000000000"');
    expect(markup).toContain('data-role="card"');
  });

  test('surface uses renderSurface when provided', ({ expect }) => {
    const markup = renderToStaticMarkup(
      <MarkdownSlide
        content='<Surface ref="echo:///01J00000000000000000000000" />'
        renderSurface={({ uri, role }) => <i>{`${role}:${uri}`}</i>}
      />,
    );
    expect(markup).toContain('<i>slide:echo:///01J00000000000000000000000</i>');
  });

  test('a card icon stands with the title as one header', ({ expect }) => {
    const markup = render('<Card icon="brain" tone="info">\n\n### Shared Memory\n\n- Beyond silos\n\n</Card>');
    // The card says it has an icon, and its tone rebinds the accent the icon is drawn in.
    expect(markup).toMatch(/<article [^>]*data-tone="info"[^>]*data-icon="ph--brain--regular"/);
    expect(markup).toMatch(/<article [^>]*style="--slide-accent: ?var\(--color-info-text\)"/);
    // One row: the icon, then the title, which keeps the type it has in any card.
    expect(markup).toMatch(
      /<header class="[^"]*flex[^"]*"><svg [^>]*data-icon="ph--brain--regular"[^>]*class="[^"]*text-\(color:--slide-accent\)[^"]*"[^>]*>.*?<\/svg><h3 [^>]*class="[^"]*text-\[56px\][^"]*"[^>]*>Shared Memory<\/h3><\/header>/,
    );
    expect(markup.match(/<svg /g)).toHaveLength(1);
  });

  test('a card with no title still shows its icon', ({ expect }) => {
    const markup = render('<Card icon="brain">\n\nJust text\n\n</Card>');
    expect(markup).toMatch(/<article [^>]*><header [^>]*><svg [^>]*>.*?<\/svg><\/header>\s*<p /);
  });

  test('a card with no icon renders no header, and its parts keep their classes', ({ expect }) => {
    const markup = render('<Card>\n\n![art](./a.png)\n\n### Title\n\nText\n\n</Card>');
    expect(markup).not.toContain('<header');
    expect(markup).not.toContain('<svg');
    expect(markup).not.toContain('data-icon');
    expect(markup).toMatch(
      /<h3 [^>]*class="px-10 pt-8 text-\[56px\] leading-tight font-\(family-name:--slide-font-heading\) text-balance"/,
    );
    expect(markup).toMatch(
      /<p [^>]*class="px-10 pb-8 pt-4 text-\[32px\] leading-snug opacity-80 last:pb-10 \[&amp;:has\(&gt;img\)\]:contents"[^>]*>Text/,
    );
  });

  test('a list in a card takes the card\u2019s text and padding, two levels deep', ({ expect }) => {
    const markup = render('<Card>\n\n### Title\n\n- one\n  - nested\n\n1. first\n\n</Card>');
    const lists = markup.match(/<(?:ul|ol) [^>]*>/g) ?? [];
    expect(lists).toHaveLength(3);
    for (const list of lists) {
      // The card's own list classes, not the slide's (`ml-12 list-disc`), whose markers hang outside the padding.
      expect(list).toMatch(/class="px-10 [^"]*list-none[^"]*text-\[32px\]/);
      expect(list).not.toContain('ml-12');
      expect(list).not.toContain('data-variant');
    }
    const items = markup.match(/<li [^>]*>/g) ?? [];
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toContain('ps-(--slide-card-indent)');
      expect(item).not.toContain('text-[48px]');
    }
  });

  test('a list outside a card, or a styled list inside one, is not the card\u2019s', ({ expect }) => {
    expect(render('- one')).toMatch(/<ul [^>]*class="[^"]*ml-12[^"]*list-disc/);
    const markup = render('<Card>\n\n<List variant="steps">\n\n1. first\n   - nested\n\n</List>\n\n</Card>');
    expect(markup).toMatch(/<ol [^>]*data-variant="steps"/);
    // A list nested in a styled list still starts clean, as it does outside a card.
    expect(markup).toMatch(/<ul [^>]*class="[^"]*ml-12[^"]*list-disc/);
  });
});

describe('backgroundStyle', () => {
  test('colors and images', () => {
    expect(backgroundStyle({ background: '#123456' })).toEqual({ backgroundColor: '#123456' });
    expect(backgroundStyle({ background: 'rgb(1, 2, 3)' })).toEqual({ backgroundColor: 'rgb(1, 2, 3)' });
    expect(backgroundStyle({ background: 'teal' })).toEqual({ backgroundColor: 'teal' });
    expect(backgroundStyle({ background: 'https://example.com/a.png' })).toMatchObject({
      backgroundImage: 'url("https://example.com/a.png")',
    });
    expect(backgroundStyle({ background: 'javascript:alert(1)' })).toEqual({});
  });

  test('backgroundColor is the ground under a picture, and the background on its own', () => {
    // CSS paints a background color under its own background image, so one element carries both.
    expect(backgroundStyle({ background: 'https://example.com/a.png', backgroundColor: '#0b1f17' })).toMatchObject({
      backgroundImage: 'url("https://example.com/a.png")',
      backgroundColor: '#0b1f17',
    });
    expect(backgroundStyle({ backgroundColor: '#0b1f17' })).toEqual({ backgroundColor: '#0b1f17' });
    // A `background:` color names the background itself, so it wins rather than sitting over a ground.
    expect(backgroundStyle({ background: 'teal', backgroundColor: '#0b1f17' })).toEqual({ backgroundColor: 'teal' });
    // An unusable picture leaves the ground, rather than nothing.
    expect(backgroundStyle({ background: 'javascript:alert(1)', backgroundColor: '#0b1f17' })).toEqual({
      backgroundColor: '#0b1f17',
    });
  });

  test('backgroundFit chooses between cropping the picture and drawing all of it', () => {
    expect(backgroundStyle({ background: 'https://example.com/a.png' })).toMatchObject({ backgroundSize: 'cover' });
    expect(backgroundStyle({ background: 'https://example.com/a.png', backgroundFit: 'contain' })).toMatchObject({
      backgroundSize: 'contain',
    });
  });

  test('backgroundBlend composites the picture with the ground, and means nothing without one', () => {
    expect(
      backgroundStyle({
        background: 'https://example.com/a.png',
        backgroundColor: '#000000',
        backgroundBlend: 'screen',
      }),
    ).toMatchObject({ backgroundBlendMode: 'screen' });
    // No picture to composite, and no ground to composite onto: neither carries a blend.
    expect(backgroundStyle({ backgroundColor: '#000000', backgroundBlend: 'screen' })).toEqual({
      backgroundColor: '#000000',
    });
    expect(backgroundStyle({ background: 'https://example.com/a.png', backgroundBlend: 'screen' })).not.toHaveProperty(
      'backgroundBlendMode',
    );
  });

  test('values containing a declaration terminator are not used as raw CSS', () => {
    expect(backgroundStyle({ background: 'rgb(1, 2, 3); color: red' })).not.toHaveProperty('backgroundColor');
    expect(backgroundStyle({ background: 'red;color:blue' })).not.toHaveProperty('backgroundColor');
    expect(
      backgroundStyle({ background: 'https://example.com/a.png', backgroundPosition: 'top; color: red' }),
    ).toMatchObject({ backgroundPosition: 'center' });
  });

  test('backgroundPosition with a semicolon is dropped from the video', () => {
    const markup = renderToStaticMarkup(
      <MarkdownSlide
        content={['---', 'backgroundVideo: clip.mp4', 'backgroundPosition: "top; color: red"', '---'].join('\n')}
      />,
    );
    expect(markup).not.toContain('color:red');
    expect(markup).not.toContain('object-position');
  });

  test('unsafe image is not painted by image-left', () => {
    const markup = renderToStaticMarkup(
      <MarkdownSlide
        content={['---', 'layout: image-left', 'image: javascript:alert(1)', '---', '', '# Hi'].join('\n')}
      />,
    );
    expect(markup).toContain('data-image');
    expect(markup).not.toContain('url(javascript');
    expect(markup).not.toContain('javascript:');
  });
});

describe('parseLineHighlights', () => {
  test('ranges', () => {
    expect(parseLineHighlights('{2,4-5}')).toEqual(new Set([2, 4, 5]));
    expect(parseLineHighlights('{1|2-3}')).toEqual(new Set([1]));
    expect(parseLineHighlights('{*}')).toBeUndefined();
    expect(parseLineHighlights(undefined)).toBeUndefined();
  });

  test('ranges are clamped to the line count', () => {
    expect(parseLineHighlights('{2-100000000}', 3)).toEqual(new Set([2, 3]));
    expect(parseLineHighlights('{1-100000000}')?.size).toBeLessThanOrEqual(10_000);
    expect(parseLineHighlights('{5}', 3)).toBeUndefined();
  });
});

describe('parseLineNumbers', () => {
  test("reads Slidev's `{lines:true}` option, alone or after line ranges", ({ expect }) => {
    expect(parseLineNumbers('{lines:true}')).toBe(true);
    expect(parseLineNumbers('{2}{lines:true}')).toBe(true);
    expect(parseLineNumbers('{2}')).toBe(false);
    expect(parseLineNumbers(undefined)).toBe(false);
  });

  test('the option block is not read as line ranges', ({ expect }) => {
    expect(parseLineHighlights('{lines:true}')).toBeUndefined();
    expect(parseLineHighlights('{2}{lines:true}')).toEqual(new Set([2]));
  });
});
