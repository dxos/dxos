//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { Slide, SlideThemeProvider } from '#components';
import { translations } from '#translations';
import { Presentation } from '#types';

import { PresentationProperties } from './PresentationProperties.tsx';

const EXAMPLE = `# Slide title

Body text in the deck's font, with an [accent link](https://dxos.org) and \`inline code\`.

\`\`\`ts
const greeting = 'Hello';
\`\`\`
`;

/** A slide painted with the deck's theme, so each change in the form shows at once. */
const ExampleSlide = ({ presentation }: { presentation: Presentation.Presentation }) => {
  const [theme] = useObject(presentation, 'theme');
  return (
    <SlideThemeProvider settings={theme}>
      <Slide.Root source={{ kind: 'markdown', id: 'example', content: EXAMPLE }}>
        <Slide.Frame inset>
          <Slide.Content />
        </Slide.Frame>
      </Slide.Root>
    </SlideThemeProvider>
  );
};

const DefaultStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  if (!presentation) {
    return <Loading />;
  }

  return (
    <div className='flex flex-col dx-fill overflow-hidden'>
      {/* The form's root lays its rows out as the parent's children, so it gets its own box. */}
      <div className='shrink-0'>
        <PresentationProperties presentation={presentation} />
      </div>
      <div className='relative flex dx-grow p-4' data-testid='example-slide'>
        <ExampleSlide presentation={presentation} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/containers/PresentationProperties',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Presentation.Presentation, Presentation.Slide, Text.Text],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Presentation.make({ name: 'Demo', slides: ['# One'] }));
        await space.db.flush({ indexes: true });
      },
    }),
  ],
  parameters: {
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The deck's theme, colors and fonts are top-level fields; unset, the fonts name the theme's defaults. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const label of ['Base', 'Accent color', 'Background color', 'Text color', 'Font', 'Code font']) {
      await expect(await canvas.findByText(label, undefined, { timeout: 10_000 })).toBeVisible();
    }
    // The theme's fields are one nested group, not loose fields of the presentation.
    const group = canvas.getByTestId('presentation.theme');
    await expect(within(group).getByText('Base')).toBeVisible();
    await expect(within(group).getByText('Code font')).toBeVisible();
    await expect(canvas.getByText('mono (default)')).toBeVisible();
    await expect(canvas.getByText('jetbrains (default)')).toBeVisible();
    // An adorned input puts its test id on the frame around it.
    await expect(within(canvas.getByTestId('accent')).getByRole('textbox')).toHaveAttribute(
      'placeholder',
      'From theme',
    );
  },
};

/** A color typed into the form repaints the example slide. */
export const ChangeColor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = await canvas.findByTestId('background', undefined, { timeout: 10_000 });
    const input = within(frame).getByRole('textbox');
    await userEvent.type(input, '#102030');
    // The first tab lands on the field's own swatch button; the second leaves the row, which saves it.
    await userEvent.tab();
    await userEvent.tab();
    const slide = canvas.getByTestId('example-slide');
    await waitFor(() =>
      expect(slide.querySelector<HTMLElement>('[style*="--slide-bg"]')?.style.getPropertyValue('--slide-bg')).toBe(
        '#102030',
      ),
    );
  },
};
