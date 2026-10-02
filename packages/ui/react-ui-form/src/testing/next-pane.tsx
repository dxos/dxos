//
// Copyright 2026 DXOS.org
//

import { type Decorator } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';

import '@dxos/react-ui/theme.css';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { osTranslations } from '@dxos/ui-theme';

import { translations as formTranslations } from '#translations';

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
  ({ width = '32rem', height = '40rem' }: { width?: string; height?: string } = {}): Decorator<PaneArgs> =>
  (Story, context) => {
    const { args } = context;
    return (
      // `safe` centring starts a pane taller than the canvas at the top instead of pushing it out of reach above it.
      <div className='fixed inset-0 grid [place-items:safe_center] overflow-auto dx-deck-surface'>
        <div
          data-testid='pane'
          className='flex flex-col'
          // Capped at the viewport, so the form scrolls inside the Panel's Body as it would in a plank.
          style={{ width: args.paneWidth ?? width, height: args.paneHeight ?? height, maxHeight: '100dvh' }}
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

/**
 * A story's form beside its values as highlighted JSON (the `TestLayout` pattern of the current Form stories); the
 * JSON's test id is `values`. Kept here because `src/components` files may carry no class names.
 */
export const NextJsonLayout = ({ data, children }: PropsWithChildren<{ data: unknown }>) => (
  <div className='grid grid-cols-2 gap-4 h-full min-h-0'>
    <div className='grid min-h-0 dx-card-surface rounded-sm overflow-hidden'>{children}</div>
    <JsonHighlighter data={data} testId='values' classNames='dx-card-surface rounded-sm text-sm min-h-0' />
  </div>
);
