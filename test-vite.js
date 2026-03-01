import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { mx } from '@dxos/ui-theme';
const attentionGlyphStyles = mx(
  'inline-block rounded-xs w-3 h-3 bg-transparent text-accent-text transition-colors',
  '[data-contains-attended=true]_&:bg-attention-surface-surface',
  '[data-attention=true]_&:bg-accent-surface',
  '[data-attention=true]_&:text-accent-surface-text',
  '[aria-current][data-attention=true]_&:bg-accent-surface',
  '[aria-current][data-attention=true]_&:text-accent-surface-text',
);
console.log(attentionGlyphStyles);
