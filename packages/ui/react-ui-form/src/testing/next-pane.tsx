//
// Copyright 2026 DXOS.org
//

import '@dxos/react-ui/next/theme.css';

import { type Decorator } from '@storybook/react-vite';
import React from 'react';

import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { osTranslations } from '@dxos/ui-theme';

import { translations as formTranslations } from '../translations.ts';

/** Args of every `src/next` story: the pane's box, which is what a Next form collapses against. */
export type PaneArgs = {
  paneWidth?: string;
  paneHeight?: string;
};

/**
 * A fixed-size frame for a story's `Next.Panel.Root` (the query container), centred on the deck surface; kept outside
 * `src/next`, whose files may not carry class names (AUDIT §3.3).
 */
export const withNextPane =
  ({ width = '32rem', height = '40rem' }: { width?: string; height?: string } = {}): Decorator =>
  (Story, context) => {
    const args = context.args as PaneArgs;
    return (
      <div className='fixed inset-0 grid place-items-center overflow-auto dx-deck-surface'>
        <div
          data-testid='pane'
          className='flex flex-col'
          style={{ width: args.paneWidth ?? width, height: args.paneHeight ?? height }}
        >
          <Story />
        </div>
      </div>
    );
  };

/** Translations for Next form stories: the form's own, react-ui's (SystemButton, steppers) and the os drag labels. */
export const nextTranslations = [
  ...formTranslations,
  ...uiTranslations,
  { 'en-US': { [osTranslations]: { 'drag-handle.label': 'Drag to rearrange' } } },
];
