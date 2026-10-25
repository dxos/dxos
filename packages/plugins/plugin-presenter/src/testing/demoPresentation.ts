//
// Copyright 2026 DXOS.org
//

import type { Database } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Presentation } from '#types';

/** Inline so the story renders offline. */
const createImage = (from: string, to: string, label: string) => {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">`,
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`,
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>`,
    `</linearGradient></defs>`,
    `<rect width="640" height="480" fill="url(#g)"/>`,
    `<text x="320" y="260" font-size="64" text-anchor="middle" fill="white" font-family="sans-serif">${label}</text>`,
    `</svg>`,
  ].join('');
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const slides = [
  ['# Presenter', '', 'Decks inside Composer.', '', '_Press → to begin._'],
  [
    '# What is a presentation?',
    '',
    '- A list of sections, one section per slide',
    '- **Owned** slides are markdown written in the deck',
    '- **Linked** objects are shown by their own slide surface',
  ],
  [
    '# Adding slides',
    '',
    '1. **Add slide** appends a new owned slide',
    '2. **Add to presentation** links an existing object',
    '3. Drag sections in the navtree to reorder',
  ],
  [
    '# Keyboard',
    '',
    '- `←` / `→` previous and next slide',
    '- `Shift+←` / `Shift+→`, `Home` / `End` jump to the first or last slide',
    '- `f` toggles fullscreen',
    '- `ESC` leaves fullscreen',
  ],
  [
    '# Code',
    '',
    '```ts',
    "const presentation = Presentation.make({ name: 'Demo', slides: ['# One', '# Two'] });",
    'Presentation.link(presentation, document);',
    '```',
  ],
  [
    '---',
    `image: "${createImage('#6366f1', '#06b6d4', 'Columns')}"`,
    'layout: image-right',
    '---',
    '# Columns',
    '',
    'Text beside an image.',
  ],
  [
    '---',
    `image: "${createImage('#10b981', '#3b82f6', 'Rows')}"`,
    'layout: image',
    '---',
    '# Rows',
    '',
    'Text over a full-bleed image.',
  ],
  ['---', `image: "${createImage('#f97316', '#ec4899', 'Fullscreen')}"`, 'layout: image', '---'],
].map((lines) => lines.join('\n'));

/**
 * Creates a deck that describes the presenter itself: owned slides covering each layout, then two linked documents.
 */
export const createDemoPresentation = (db: Database.Database): Presentation.Presentation => {
  const presentation = db.add(Presentation.make({ name: 'Presenter', slides }));
  Presentation.link(
    presentation,
    db.add(
      Markdown.make({
        name: 'Linked document',
        content: '# Linked document\n\nThis slide is a markdown document, shown through its slide surface.',
      }),
    ),
  );
  Presentation.link(
    presentation,
    db.add(
      Markdown.make({
        name: 'Another document',
        content: '# Another document\n\nEdit it anywhere; the deck always shows its current content.',
      }),
    ),
  );
  return presentation;
};
