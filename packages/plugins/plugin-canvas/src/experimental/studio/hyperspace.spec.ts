//
// Copyright 2026 DXOS.org
//

//
// The Hyperspace slide: what a person works in, what holds it, and what it reaches — three columns, with the field
// of spaces in the middle drawn by the substrate kind.
//

import { type SlideSpec } from './spec.ts';
import { type StudioModel, studioComponentData } from './studio.ts';

/** A service: one row of glyph and title, with what it does in mono under it. */
const service = (id: string, label: string, icon: string, footer: string, tone?: string) => ({
  id,
  label,
  icon,
  footer,
  variant: 'simple' as const,
  ...(tone ? { tone } : {}),
});

/** Takes the sidecar so the generated components keep the geometry they were generated with. */
export const hyperspaceSpec = (model: StudioModel): SlideSpec => {
  /** A generated component, taking its box and fields from the sidecar. */
  const component = (id: string, component: string) => ({ id, component, ...studioComponentData(model, id) });
  return {
    id: 'hyperspace',
    title: 'Composer · ECHO Hyperspace · EDGE Services',
    metrics: { cardWidth: 304, cardHeight: 64, rowGap: 16, columnGap: 96, groupGap: 96 },
    groups: [
      {
        id: 'composer',
        heading: 'Composer',
        columns: [
          [component('plank-board', 'plank'), component('plank-sheet', 'plank'), component('plank-thread', 'plank')],
        ],
      },
      {
        id: 'hyperspace',
        heading: 'ECHO Hyperspace',
        box: true,
        columns: [[component('substrate', 'substrate')]],
      },
      {
        id: 'services',
        heading: 'EDGE Services',
        columns: [
          [
            // The deck's hint that the column runs on past the ten the slide has room for.
            service('calendar', 'Calendar', 'calendar-blank', 'events · free/busy', 'var(--t-event)'),
            service('email', 'Email', 'envelope', 'send · receive', 'var(--t-message)'),
            service('storage', 'Storage', 'database', 'blobs · objects', 'var(--t-file)'),
            service('translation', 'Translation', 'translate', 'text ↔ locale'),
            service('search', 'Search', 'magnifying-glass', 'index · query'),
            service('sql', 'SQL', 'table', 'tables · queries'),
            service('files', 'Files', 'folder', 'drives · folders'),
            service('commerce', 'Commerce', 'shopping-cart', 'catalog · checkout'),
            service('travel', 'Travel', 'airplane-tilt', 'flights · stays', 'var(--t-trip)'),
            service('slack', 'Slack', 'hash', 'channels · threads'),
            { id: 'more-down', shape: 'fat-arrow' as const, up: false, width: 64, height: 34 },
          ],
        ],
      },
    ],
    // The deck's dashed taps: two planks reading out of the field they draw from.
    edges: [
      { from: 'plank-board', to: 'substrate', tap: true },
      { from: 'plank-thread', to: 'substrate', tap: true },
    ],
  };
};
