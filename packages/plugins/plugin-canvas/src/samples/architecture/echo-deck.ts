//
// Copyright 2026 DXOS.org
//

import { EID } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import deck from './echo.md?raw';

/** The architecture drawings the deck embeds, by the diagram id its `{{…}}` placeholders name. */
export type EchoDeckDrawings = Readonly<Record<string, Drawing.Drawing>>;

const PLACEHOLDER = /\{\{([a-z-]+)\}\}/g;

/**
 * The ECHO presentation: a slide per `---` of `echo.md`, each `{{diagram-id}}` replaced with that drawing's
 * space-relative URI so its `<Surface>` embeds resolve in whatever space the template seeds.
 */
export const makeEchoDeck = (drawings: EchoDeckDrawings): Presentation.Presentation =>
  Presentation.makeFromMarkdown({
    name: 'ECHO',
    markdown: deck.replaceAll(PLACEHOLDER, (placeholder, id: string) => {
      const drawing = drawings[id];
      if (!drawing) {
        throw new Error(`The ECHO deck embeds an unknown diagram: ${placeholder}.`);
      }
      return EID.make({ entityId: drawing.id });
    }),
  });
