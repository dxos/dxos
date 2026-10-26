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
  test('heading uses the theme accent', ({ expect }) => {
    expect(render('# Title')).toMatch(/<h1 [^>]*class="[^"]*text-\(color:--slide-accent\)[^"]*"[^>]*>Title<\/h1>/);
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
