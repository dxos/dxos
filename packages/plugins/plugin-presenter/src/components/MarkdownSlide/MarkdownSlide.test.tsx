//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { MarkdownSlide, parseLineHighlights } from './MarkdownSlide.tsx';
import { backgroundStyle } from './SlideBackground.tsx';

const render = (content: string, step?: number) =>
  renderToStaticMarkup(<MarkdownSlide content={content} step={step} />);

const clicks = ['<v-clicks>', '', '- one', '- two', '- three', '', '</v-clicks>'].join('\n');

describe('MarkdownSlide', () => {
  test('heading uses the accent class', ({ expect }) => {
    expect(render('# Title')).toMatch(/<h1 class="[^"]*text-accent-text[^"]*">Title<\/h1>/);
  });

  test('step 0 hides every click item', ({ expect }) => {
    const markup = render(clicks, 0);
    expect(markup.match(/<li[^>]*class="[^"]*invisible/g)).toHaveLength(3);
  });

  test('step 2 shows two of three click items', ({ expect }) => {
    const markup = render(clicks, 2);
    expect(markup.match(/<li[^>]*data-step="\d"/g)).toHaveLength(3);
    expect(markup.match(/<li[^>]*class="[^"]*invisible/g)).toHaveLength(1);
    expect(markup).toMatch(/<li class="[^"]*invisible"[^>]*data-step="3"/);
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

  test('surface renders a placeholder without a renderer', ({ expect }) => {
    const markup = render('<Surface ref="echo:///01J00000000000000000000000" role="card" />');
    expect(markup).toContain('data-surface="echo:///01J00000000000000000000000"');
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
});

describe('parseLineHighlights', () => {
  test('ranges', () => {
    expect(parseLineHighlights('{2,4-5}')).toEqual(new Set([2, 4, 5]));
    expect(parseLineHighlights('{1|2-3}')).toEqual(new Set([1]));
    expect(parseLineHighlights('{*}')).toBeUndefined();
    expect(parseLineHighlights(undefined)).toBeUndefined();
  });
});
