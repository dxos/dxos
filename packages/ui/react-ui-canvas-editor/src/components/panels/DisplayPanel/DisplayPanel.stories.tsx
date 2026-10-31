//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { type BackgroundGrid, defaultThemeRegistry, resolveLook } from '@dxos/react-ui-canvas';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { DisplayPanel } from './DisplayPanel.tsx';

/** The bar over local state, as a canvas keeps its theme and grid overrides. */
const DefaultStory = () => {
  const [theme, setTheme] = useState<string>();
  const [grid, setGrid] = useState<BackgroundGrid>();
  const [guides, setGuides] = useState(false);
  const look = useMemo(() => resolveLook(defaultThemeRegistry, { theme }), [theme]);
  return (
    <DisplayPanel
      registry={defaultThemeRegistry}
      theme={look.theme}
      override={theme}
      grid={grid ?? look.background.grid}
      themeGrid={look.background.grid}
      guides={guides}
      onThemeChange={setTheme}
      onGridChange={setGrid}
      onGuidesToggle={() => setGuides((value) => !value)}
    />
  );
};

/**
 * Test:
 * 1. The theme menu lists every theme with its swatch; picking one changes the name shown, Default clears it.
 * 2. The grid buttons pick dots, lines or none; picking the theme's own grid again clears the override.
 */
const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas-editor/components/panels/DisplayPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: uiTranslations },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
