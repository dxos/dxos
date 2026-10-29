//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SlideTheme } from '#types';

import { MarkdownSlide } from '../MarkdownSlide/index.ts';
import { Slide } from '../Slide/index.ts';
import { SlideThemeProvider, useSlideThemeStyle } from './SlideTheme.tsx';

const CONTENT = [
  '# Local-first',
  '',
  '- Data lives on the device',
  '- Sync is peer to peer',
  '',
  '> The network is optional.',
  '',
  '```ts',
  "const space = await client.spaces.create({ name: 'Demo' });",
  '```',
].join('\n');

type StoryProps = { themes: SlideTheme.Settings[] };

/** One line naming a variant's settings, e.g. `serif · font: display`. */
const caption = (settings: SlideTheme.Settings) =>
  Object.entries(settings)
    .map(([key, value]) => (key === 'name' ? String(value) : `${key}: ${value}`))
    .join(' · ');

/** Every variant as a full-width 16:9 slide, one under another, in a column that scrolls. */
const DefaultStory = ({ themes }: StoryProps) => (
  <div className='size-full overflow-y-auto'>
    <div className='flex flex-col gap-8 p-8 max-w-[64rem] mx-auto'>
      {themes.map((settings, index) => (
        <figure key={index} data-theme-name={settings.base} className='flex flex-col gap-2 m-0'>
          <figcaption className='text-sm text-description font-mono'>{caption(settings)}</figcaption>
          <div className='flex aspect-video'>
            <SlideThemeProvider settings={settings}>
              <Slide.Frame inset>
                <MarkdownSlide content={CONTENT} />
              </Slide.Frame>
            </SlideThemeProvider>
          </div>
        </figure>
      ))}
    </div>
  </div>
);

const SPECIMEN_TITLE = 'The quick brown fox jumps over the lazy dog';

const SPECIMEN_TEXT =
  'Local-first software keeps your data on your own devices, syncs it peer to peer, and still lets a whole team ' +
  'work on it together. Numbers 0123456789, and punctuation: “quotes”, (brackets) & ampersands. 中文：本地优先的软件。';

const SPECIMEN_CODE = "const space = await client.spaces.create({ name: 'Demo' }); // 0O 1lI";

type SpecimenProps = { label: string; settings: SlideTheme.Settings; code?: boolean };

/** One font's sample: a title and a paragraph in it (or a line of code), loaded on demand as a deck would. */
const Specimen = ({ label, settings, code }: SpecimenProps) => (
  <SlideThemeProvider settings={settings}>
    <SpecimenText label={label} code={code} />
  </SlideThemeProvider>
);

const SpecimenText = ({ label, code }: Pick<SpecimenProps, 'label' | 'code'>) => {
  const style = useSlideThemeStyle();
  const family = code ? 'var(--slide-font-mono)' : 'var(--slide-font-body)';
  return (
    <section data-font={label} style={style} className='flex flex-col gap-3 py-8 border-b border-separator'>
      <div className='text-xs text-description font-mono'>{label}</div>
      {code ? (
        <pre className='m-0 text-lg whitespace-pre-wrap' style={{ fontFamily: family }}>
          {SPECIMEN_CODE}
        </pre>
      ) : (
        <>
          <h2 className='m-0 text-4xl' style={{ fontFamily: 'var(--slide-font-heading)' }}>
            {SPECIMEN_TITLE}
          </h2>
          <p className='m-0 text-lg leading-relaxed' style={{ fontFamily: family }}>
            {SPECIMEN_TEXT}
          </p>
        </>
      )}
    </section>
  );
};

/** Every text font, then every code font, in one scrolling list. */
const FontSpecimensStory = () => (
  <div className='size-full overflow-y-auto'>
    <div className='flex flex-col px-8 max-w-[56rem] mx-auto'>
      {SlideTheme.FONTS.map((font) => (
        <Specimen key={font} label={`font: ${font}`} settings={{ font }} />
      ))}
      {SlideTheme.MONO_FONTS.map((monoFont) => (
        <Specimen key={monoFont} label={`monoFont: ${monoFont}`} settings={{ monoFont }} code />
      ))}
    </div>
  </div>
);

const meta = {
  title: 'plugins/plugin-presenter/components/SlideTheme',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every built-in theme rendering the same slide. */
export const Default: Story = {
  args: { themes: SlideTheme.NAMES.map((base) => ({ base })) },
  play: async ({ canvasElement }) => {
    const slide = (name: string) => {
      const element = canvasElement.querySelector(`[data-theme-name="${name}"] [data-slide]`);
      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing ${name} slide`);
      }
      return element;
    };
    const [light, dark] = await waitFor(() => [slide('light'), slide('dark')]);
    await expect(dark.style.colorScheme).toBe('dark');
    await expect(light.style.colorScheme).toBe('light');
    await expect(getComputedStyle(light).backgroundColor).not.toBe(getComputedStyle(dark).backgroundColor);
  },
};

/** Accent, background, text color and font overrides; the unsafe accent is ignored. */
const OVERRIDES: SlideTheme.Settings[] = [
  { base: 'dark', accent: '#f97316' },
  { base: 'light', background: '#fef3c7', foreground: '#451a03', accent: '#b45309' },
  { base: 'serif', accent: 'oklch(65% 0.2 300)' },
  { base: 'default', accent: 'url(https://example.com/x)', font: 'sans' },
];

/** Each text font with a code font; web fonts load on first use. */
const FONTS: SlideTheme.Settings[] = [
  { base: 'default', font: 'sans', monoFont: 'fira' },
  { base: 'default', font: 'rounded', monoFont: 'plex' },
  { base: 'light', font: 'serif', monoFont: 'jetbrains' },
  { base: 'dark', font: 'display', monoFont: 'system' },
];

/** Every variant in one column: the built-in themes, then overrides, then font pairings. */
export const All: Story = {
  args: { themes: [...SlideTheme.NAMES.map((base) => ({ base })), ...OVERRIDES, ...FONTS] },
};

export const Overrides: Story = { args: { themes: OVERRIDES } };

export const Fonts: Story = { args: { themes: FONTS } };

/** The same title and paragraph in each text font, and a line of code in each code font. */
export const FontSpecimens: Story = {
  args: { themes: [] },
  render: () => <FontSpecimensStory />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-font]')).toHaveLength(
      SlideTheme.FONTS.length + SlideTheme.MONO_FONTS.length,
    );
  },
};
