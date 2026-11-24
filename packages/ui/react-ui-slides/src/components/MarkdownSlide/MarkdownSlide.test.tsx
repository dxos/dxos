//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { SlideFooterProvider, SlidePositionProvider } from '../SlideDeck/index.ts';
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

  test('bold text takes the subheading color at the body’s weight', ({ expect }) => {
    const markup = render('- **ECHO** holds the data');
    const classes = markup.match(/<li [^>]*>\s*<strong [^>]*class="([^"]*)"/)?.[1] ?? '';
    expect(classes).toContain('text-[color:var(--slide-subheading,var(--slide-accent))]');
    expect(classes.split(' ')).toContain('font-normal');
  });

  test('bold text in a flow card is its title, in the card’s color and a bold weight', ({ expect }) => {
    const markup = render('<List variant="flow">\n\n1. **Chat** A model\n\n</List>');
    const classes = markup.match(/<ol [^>]*data-variant="flow"[^>]*>\s*<li [^>]*class="([^"]*)"/)?.[1] ?? '';
    expect(classes).toContain('[&amp;_strong]:text-[color:inherit]');
    expect(classes).toContain('[&amp;_strong]:font-bold');
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
      /<header class="[^"]*flex[^"]*"><svg [^>]*data-icon="ph--brain--regular"[^>]*class="[^"]*text-\(color:--slide-accent\)[^"]*"[^>]*>.*?<\/svg><h3 [^>]*class="[^"]*text-\[length:var\(--slide-card-title\)\][^"]*"[^>]*>Shared Memory<\/h3><\/header>/,
    );
    expect(markup.match(/<svg /g)).toHaveLength(1);
  });

  test('an icon card is a header over a body, and nothing else', ({ expect }) => {
    const markup = render('<Card icon="brain">\n\nLead\n\n### Title\n\n- one\n\n</Card>');
    // What is written ahead of the title joins the body, so the header is the card's first row in every card.
    expect(markup).toMatch(
      /<article [^>]*><header [^>]*>.*?<\/header><div class="[^"]*\[grid-row:2\/-1\][^"]*"><p [^>]*>Lead<\/p>\s*<ul [^>]*>.*?<\/ul><\/div><\/article>/s,
    );
    // The card lays the two out on rows of its own, which a grid replaces with its own (see the grid's classes).
    expect(markup).toMatch(/<article [^>]*class="[^"]*\[&amp;\[data-icon\]\]:grid /);
  });

  test('a grid publishes its alignment, and its rows hold a header track where it holds icon cards', ({ expect }) => {
    const centred = render('<Grid cols="3" align="center">\n\n<Card icon="brain">\n\n### A\n\n</Card>\n\n</Grid>');
    expect(centred).toMatch(/<div [^>]*data-variant="default"[^>]*data-align="center"/);
    const classes = centred.match(/<div [^>]*data-variant="default"[^>]*class="([^"]*)"/)?.[1] ?? '';
    expect(classes).toContain('data-[align]:grow-0');
    expect(classes).toContain('data-[align=center]:my-auto');
    expect(classes).toContain('[&amp;:has(&gt;[data-icon])]:[grid-auto-rows:auto_minmax(0,1fr)]');
    expect(classes).toContain('[&amp;&gt;article[data-icon]]:grid-rows-subgrid');
    // Every child covers both tracks of a row, not only the cards and cells that carry a span of their own.
    expect(classes).toContain('[&amp;:has(&gt;[data-icon])&gt;*]:[grid-row:span_calc(var(--slide-row-span,1)*2)]');
    // A grid that asks for nothing fills the space it is given, as it always has.
    expect(render('<Grid cols="3">\n\nCells\n\n</Grid>')).not.toContain('data-align');
  });

  test('click tags straight inside a grid leave no box, so what they reveal stays the grid\u2019s children', ({
    expect,
  }) => {
    const card = (title: string) => `<Card icon="brain">\n\n### ${title}\n\n</Card>`;
    const grid = (...children: string[]) => ['<Grid cols="3">', ...children, '</Grid>'].join('\n\n');
    const built = grid('<v-clicks>', card('One'), card('Two'), card('Three'), '</v-clicks>');

    // The cards follow the grid's own tag with nothing between them, each with its step, hidden until it.
    const markup = render(built, 1);
    expect(markup).not.toContain('data-click');
    expect(markup).toMatch(/<div [^>]*data-variant="default"[^>]*>\s*<article /);
    const cards = [...markup.matchAll(/<article [^>]*>/g)].map(([tag]) => tag);
    expect(cards.map((tag) => tag.match(/data-step="(\d)"/)?.[1])).toEqual(['1', '2', '3']);
    expect(cards.map((tag) => / class="[^"]*\binvisible\b/.test(tag))).toEqual([false, true, true]);

    // A single `<v-click>` hands its step to the card it wraps, and `<v-after>` the step before it.
    const single = render(grid(card('One'), `<v-click>\n\n${card('Two')}\n\n</v-click>`), 0);
    expect(single).not.toContain('data-click');
    const [first, second] = [...single.matchAll(/<article [^>]*>/g)].map(([tag]) => tag);
    expect(first).not.toContain('data-step');
    expect(second).toContain('data-step="1"');
    expect(second).toMatch(/ class="[^"]*\binvisible\b/);

    // Outside a grid a click tag is still a box of its own.
    expect(render(`<v-clicks>\n\n${card('One')}\n\n</v-clicks>`)).toContain('data-click="slide-clicks"');
  });

  test('a flow grid draws an arrow into each child, and cuts off the one into a row\u2019s first', ({ expect }) => {
    const markup = render('<Grid cols="4" variant="flow">\n\n<Card icon="brain">\n\n### A\n\n</Card>\n\n</Grid>');
    const classes = markup.match(/<div [^>]*data-variant="flow"[^>]*class="([^"]*)"/)?.[1] ?? '';
    // It is still the grid: the tracks, the alignment and the icon cards' shared header rows.
    expect(classes).toContain('[grid-template-columns:repeat(var(--slide-grid-cols,1),minmax(0,1fr))]');
    expect(classes).toContain('[&amp;&gt;article[data-icon]]:grid-rows-subgrid');
    // The arrow stands before its child, in a gap as wide as its box, and a card lets it out of its own box.
    expect(classes).toContain('gap-x-24');
    expect(classes).toContain('[&amp;&gt;*]:before:w-24');
    expect(classes).toContain('[&amp;&gt;*]:before:end-full');
    expect(classes).toContain('[&amp;&gt;*]:before:content-[&#x27;→&#x27;]');
    expect(classes).toContain('[&amp;&gt;article]:overflow-visible');
    // A flow's cards are narrow, so the grid sets their title and icon a step under the sizes a card gives itself.
    expect(classes).toContain('[&amp;&gt;article]:[--slide-card-title:48px]');
    expect(classes).toContain('[&amp;&gt;article]:[--slide-card-icon:60px]');
    const card = markup.match(/<article [^>]*class="([^"]*)"/)?.[1] ?? '';
    expect(card).toContain('[--slide-card-title:56px]');
    expect(card).toContain('[--slide-card-icon:70px]');
    // The arrow into a row's first child falls outside the grid, which cuts it, so nothing here counts columns.
    expect(classes).toContain('overflow-x-clip');
    expect(markup).not.toContain('data-row-end');
    // An arrow belongs to the child it points at and to nothing else, so no rule reads a sibling's visibility.
    expect(classes).not.toContain('.invisible');
    // A plain grid draws none.
    expect(render('<Grid cols="4">\n\nCells\n\n</Grid>')).not.toContain('before:content-');
  });

  test('a list nested in a flow item takes the card\u2019s size, not the slide\u2019s', ({ expect }) => {
    const markup = render('<List variant="flow">\n\n1. **Chat** A model\n   - Search\n   - Recall\n\n</List>');
    const classes = markup.match(/<ol [^>]*data-variant="flow"[^>]*>\s*<li [^>]*class="([^"]*)"/)?.[1] ?? '';
    expect(classes).toContain('[&amp;_li]:text-[length:inherit]');
    expect(classes).toContain('[&amp;_:is(ul,ol)]:ml-10');
  });

  test('a title box sets its name in the brand\u2019s display face, not the deck\u2019s heading font', ({ expect }) => {
    const markup = render('<Box variant="title">\n\n# composer\n\n</Box>');
    const classes = markup.match(/<h1 [^>]*class="([^"]*)"/)?.[1] ?? '';
    // Its size and place were measured for Poiret One, so the deck's own font must not reach it.
    expect(classes).toContain('font-[&#x27;Poiret_One&#x27;,ui-sans-serif,sans-serif]');
    expect(classes).not.toContain('--slide-font-heading');
    // A heading outside the box still takes the deck's.
    expect(render('# composer')).toMatch(/<h1 [^>]*class="[^"]*font-\(family-name:--slide-font-heading\)/);
  });

  test('the counters draw the slide\u2019s place in its deck, and a dash where it has none', ({ expect }) => {
    const content = 'Slide <SlideCurrentNo /> of <SlidesTotal />';
    const counters = (markup: string) =>
      [...markup.matchAll(/<span data-slide-counter="(current|total)"[^>]*>([^<]*)<\/span>/g)].map(
        ([, counter, value]) => [counter, value],
      );
    const placed = renderToStaticMarkup(
      <SlidePositionProvider current={3} total={12}>
        <MarkdownSlide content={content} />
      </SlidePositionProvider>,
    );
    expect(counters(placed)).toEqual([
      ['current', '3'],
      ['total', '12'],
    ]);
    expect(placed).toMatch(/<span data-slide-counter="current" class="tabular-nums">/);
    // A slide outside a deck (the editor's preview, a lone slide) still shows where each number goes.
    expect(counters(render(content))).toEqual([
      ['current', '\u2013'],
      ['total', '\u2013'],
    ]);
    // A slide the deck leaves out when presented has no number, only the total.
    const hidden = renderToStaticMarkup(
      <SlidePositionProvider total={12}>
        <MarkdownSlide content={content} />
      </SlidePositionProvider>,
    );
    expect(counters(hidden)).toEqual([
      ['current', '\u2013'],
      ['total', '12'],
    ]);
  });

  test('a deck\u2019s footer is drawn on a slide as three parts of inline markdown', ({ expect }) => {
    const footer = {
      left: 'DXOS',
      center: '[dxos.org](https://dxos.org)',
      right: '<SlideCurrentNo /> / <SlidesTotal />',
    };
    const inDeck = (content: string) =>
      renderToStaticMarkup(
        <SlideFooterProvider settings={footer}>
          <SlidePositionProvider current={2} total={9}>
            <MarkdownSlide content={content} />
          </SlidePositionProvider>
        </SlideFooterProvider>,
      );
    const markup = inDeck('# Title');
    const part = (name: string) => markup.match(new RegExp(`<div data-part="${name}"[^>]*>(.*?)</div>`))?.[1];
    // A part is a phrase: no paragraph of its own, so it takes the footer's type rather than the slide's body size.
    expect(part('left')).toBe('DXOS');
    expect(part('center')).toMatch(/^<a [^>]*href="https:\/\/dxos.org"[^>]*>dxos.org<\/a>$/);
    expect(part('right')).toMatch(
      /data-slide-counter="current"[^>]*>2<\/span> \/ <span data-slide-counter="total"[^>]*>9</,
    );
    // One quiet line over the slide's bottom padding, which takes no clicks but a link's own.
    const classes = markup.match(/<footer data-slide-footer="true" class="([^"]*)"/)?.[1] ?? '';
    expect(classes).toContain('absolute');
    expect(classes).toContain('bottom-0');
    expect(classes).toContain('h-16');
    expect(classes).toContain('pointer-events-none');
    // No deck footer, no layer; and a footer with nothing in it draws nothing either.
    expect(render('# Title')).not.toContain('data-slide-footer');
    expect(
      renderToStaticMarkup(
        <SlideFooterProvider settings={{ left: ' ' }}>
          <MarkdownSlide content='# Title' />
        </SlideFooterProvider>,
      ),
    ).not.toContain('data-slide-footer');
  });

  test('a slide switches the footer off, a cover and an end slide show none, and either can ask for it', ({
    expect,
  }) => {
    const shown = (content: string) =>
      renderToStaticMarkup(
        <SlideFooterProvider settings={{ left: 'DXOS' }}>
          <MarkdownSlide content={content} />
        </SlideFooterProvider>,
      ).includes('data-slide-footer');
    expect(shown('# Title')).toBe(true);
    expect(shown('---\nlayout: two-cols\n---\n\n# Title')).toBe(true);
    expect(shown('---\nfooter: false\n---\n\n# Title')).toBe(false);
    expect(shown('---\nlayout: cover\n---\n\n# Title')).toBe(false);
    expect(shown('---\nlayout: end\n---\n\n# Title')).toBe(false);
    expect(shown('---\nlayout: cover\nfooter: true\n---\n\n# Title')).toBe(true);
    expect(shown('---\nlayout: end\nfooter: true\n---\n\n# Title')).toBe(true);
  });

  test('a card with no title still shows its icon', ({ expect }) => {
    const markup = render('<Card icon="brain">\n\nJust text\n\n</Card>');
    expect(markup).toMatch(/<article [^>]*><header [^>]*><svg [^>]*>.*?<\/svg><\/header><div [^>]*><p /);
  });

  test('a card with no icon renders no header, and its parts keep their classes', ({ expect }) => {
    const markup = render('<Card>\n\n![art](./a.png)\n\n### Title\n\nText\n\n</Card>');
    expect(markup).not.toContain('<header');
    expect(markup).not.toContain('<svg');
    // No body wrapper either: the card's children are its own, as they always were.
    expect(markup).toMatch(/<article [^>]*><p [^>]*><img [^>]*><\/p>\s*<h3 /);
    expect(markup).not.toContain('data-icon="');
    expect(markup).toMatch(
      /<h3 [^>]*class="px-10 pt-8 text-\[length:var\(--slide-card-title\)\] leading-tight font-\(family-name:--slide-font-heading\) text-balance"/,
    );
    expect(markup).toMatch(
      /<p [^>]*class="px-10 pb-8 pt-4 text-\[32px\] leading-snug opacity-80 last:pb-10 \[&amp;:has\(&gt;img\)\]:contents"[^>]*>Text/,
    );
  });

  test('a list in a card takes the card\u2019s list size and padding, two levels deep', ({ expect }) => {
    const markup = render('<Card>\n\n### Title\n\n- one\n  - nested\n\n1. first\n\n</Card>');
    const lists = markup.match(/<(?:ul|ol) [^>]*>/g) ?? [];
    expect(lists).toHaveLength(3);
    for (const list of lists) {
      // The card's own list classes, not the slide's (`ml-12 list-disc`), whose markers hang outside the padding.
      expect(list).toMatch(/class="px-10 [^"]*list-none[^"]*text-\[40px\]/);
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
