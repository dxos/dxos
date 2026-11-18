//
// Copyright 2026 DXOS.org
//

import { Dsl } from '@dxos/diagram';
import { EID } from '@dxos/echo';
import type * as Canvas from '@dxos/plugin-canvas/Canvas';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import agent from './diagrams/agent.dx?raw';
import agents from './diagrams/agents.dx?raw';
import architecture from './diagrams/architecture.dx?raw';
import chat from './diagrams/chat.dx?raw';
import composer from './diagrams/composer.dx?raw';
import echo from './diagrams/echo.dx?raw';
import hyperspace from './diagrams/hyperspace.dx?raw';
import ontology from './diagrams/ontology.dx?raw';
import plugins from './diagrams/plugins.dx?raw';

/** A slide of the deck: its diagram, written as intent (`diagram kind=grid`), and the title its slide carries. */
export type StudioSlide = { id: string; title: string; source: string };

/** The nine slides in the order they are presented. */
export const STUDIO_SLIDES: readonly StudioSlide[] = [
  { id: 'hyperspace', title: 'Composer · ECHO Hyperspace · EDGE Services', source: hyperspace },
  { id: 'echo', title: 'ECHO', source: echo },
  { id: 'ontology', title: 'Ontologies', source: ontology },
  { id: 'plugins', title: 'Plugins', source: plugins },
  { id: 'composer', title: 'Composer', source: composer },
  { id: 'architecture', title: 'Architecture', source: architecture },
  { id: 'agents', title: 'Agents', source: agents },
  { id: 'chat', title: 'Chat', source: chat },
  { id: 'agent', title: 'Agent', source: agent },
];

/** The frame every slide's diagram states: one page, so a card on one slide is the size of a card on another. */
export const STUDIO_PAGE = { x: 0, y: 0, width: 1600, height: 880 } as const;

/** How far a slide may magnify the page. A fit stops at 1:1 by default, and a slide is wider than the page. */
const FIT_ZOOM = 4;

/**
 * The canvas a slide is drawn on: the deck's look, its 8px pitch, and the page as what a fit frames. The Neu ground
 * draws no grid of its own, so `backgroundGrid` gives the drawing something to place against.
 */
export const STUDIO_CANVAS: Partial<Canvas.CanvasSettings> = {
  styleSet: 'neu',
  background: 'neu',
  grid: 8,
  backgroundGrid: 'dots',
  fitFrame: STUDIO_PAGE,
  fitZoom: FIT_ZOOM,
};

/** The commands a slide's text draws; a slide that does not parse is a broken bundled file, so it throws. */
export const slideCommands = ({ id, source }: StudioSlide) => {
  const { commands, problems } = Dsl.parse(source);
  const errors = problems.filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    throw new Error(`The ${id} slide does not parse: ${errors.map(({ message }) => message).join(' · ')}`);
  }
  return commands;
};

const DESCRIPTION =
  'DXOS as canvas drawings: ECHO as a hyperspace of spaces, its layers, the ontology, the plugin model, Composer, ' +
  'the architecture, agents and their feeds, a chat and an agent at work.';

/** A slide of the deck: its title, then the drawing itself rather than a picture of it. */
const slideMarkdown = (title: string, drawing: Drawing.Drawing): string =>
  [
    '---',
    'layout: default',
    '---',
    '',
    `# ${title}`,
    '',
    `<Surface ref="${EID.make({ entityId: drawing.id })}" />`,
    '',
  ].join('\n');

/** The presentation: a slide per drawing, in the order of {@link STUDIO_SLIDES}. */
export const makeStudioDeck = (drawings: readonly Drawing.Drawing[]): Presentation.Presentation =>
  Presentation.make({
    name: 'DXOS',
    description: DESCRIPTION,
    theme: { accent: '#2d6fff', font: 'space-grotesk', monoFont: 'fira' },
    slides: STUDIO_SLIDES.flatMap(({ title }, index) => {
      const drawing = drawings[index];
      return drawing ? [slideMarkdown(title, drawing)] : [];
    }),
  });
