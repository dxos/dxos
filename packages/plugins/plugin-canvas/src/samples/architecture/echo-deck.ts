//
// Copyright 2026 DXOS.org
//

import { EID } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import type * as SlideTheme from '@dxos/plugin-presenter/SlideTheme';

import deck from './echo.md?raw';

/** The architecture drawings the deck embeds, by the diagram id its `{{…}}` placeholders name. */
export type EchoDeckDrawings = Readonly<Record<string, Drawing.Drawing>>;

const PLACEHOLDER = /\{\{([a-z-]+)\}\}/g;

const DESCRIPTION =
  'ECHO, the DXOS object database, built up from its foundations: types, the CRDT that stores them, the spaces ' +
  'that share them, and how they are queried, replicated, migrated and acted on.';

/** The deck's look: the default theme (following the app's light/dark mode) with a cyan accent and technical fonts. */
const THEME: SlideTheme.Settings = { accent: '#0891b2', font: 'space-grotesk', monoFont: 'fira' };

/**
 * The ECHO presentation: a slide per `---` of `echo.md`, each `{{diagram-id}}` replaced with that drawing's
 * space-relative URI so its `<Surface>` embeds resolve in whatever space the template seeds; with a description and
 * its own theme.
 */
export const makeEchoDeck = (drawings: EchoDeckDrawings): Presentation.Presentation =>
  Presentation.makeFromMarkdown({
    name: 'ECHO',
    description: DESCRIPTION,
    theme: THEME,
    markdown: deck.replaceAll(PLACEHOLDER, (placeholder, id: string) => {
      const drawing = drawings[id];
      if (!drawing) {
        throw new Error(`The ECHO deck embeds an unknown diagram: ${placeholder}.`);
      }
      return EID.make({ entityId: drawing.id });
    }),
  });
