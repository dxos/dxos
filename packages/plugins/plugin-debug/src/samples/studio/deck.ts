//
// Copyright 2026 DXOS.org
//

import { DSL } from '@dxos/diagram';
import { EID } from '@dxos/echo';
import type * as Canvas from '@dxos/plugin-canvas/Canvas';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import agentsDiagram from './diagrams/agents.dx?raw';
import architectureDiagram from './diagrams/architecture.dx?raw';
import composerDiagram from './diagrams/composer.dx?raw';
import echoDiagram from './diagrams/echo.dx?raw';
import hyperspaceDiagram from './diagrams/hyperspace.dx?raw';
// import ontologyDiagram from './diagrams/ontology.dx?raw';
import pluginsDiagram from './diagrams/plugins.dx?raw';
import reactDiagram from './diagrams/react.dx?raw';
import superagentDiagram from './diagrams/superagent.dx?raw';
import agents from './slides/agents.md?raw';
import architecture from './slides/architecture.md?raw';
import composer from './slides/composer.md?raw';
import cover from './slides/cover.md?raw';
import demo from './slides/demo.md?raw';
import echo from './slides/echo.md?raw';
import evolution from './slides/evolution.md?raw';
import hyperspace from './slides/hyperspace.md?raw';
import next from './slides/next.md?raw';
// import ontology from './slides/ontology.md?raw';
import plugins from './slides/plugins.md?raw';
import react from './slides/react.md?raw';
import stack from './slides/stack.md?raw';
import superagent from './slides/superagent.md?raw';

/** A diagram the deck draws: its text, written as intent (`diagram kind=grid`), and the id a slide embeds it by. */
export type StudioDiagram = { id: string; source: string };

/** A slide of the deck: a markdown file in the presenter's dialect, titled by its frontmatter or its first heading. */
export type StudioSlide = { id: string; markdown: string };

/** The diagrams, each drawn once; a slide embeds one by naming it (`<Surface ref="{{echo}}" />`). */
export const STUDIO_DIAGRAMS: readonly StudioDiagram[] = [
  { id: 'echo', source: echoDiagram },
  { id: 'hyperspace', source: hyperspaceDiagram },
  // { id: 'ontology', source: ontologyDiagram },
  { id: 'plugins', source: pluginsDiagram },
  { id: 'composer', source: composerDiagram },
  { id: 'architecture', source: architectureDiagram },
  { id: 'agents', source: agentsDiagram },
  { id: 'react', source: reactDiagram },
  { id: 'superagent', source: superagentDiagram },
];

/** The slides in the order they are presented; `slides/<id>.md` is where a title or a note is changed. */
export const STUDIO_SLIDES: readonly StudioSlide[] = [
  { id: 'cover', markdown: cover },
  { id: 'stack', markdown: stack },
  { id: 'evolution', markdown: evolution },
  { id: 'echo', markdown: echo },
  { id: 'hyperspace', markdown: hyperspace },
  // { id: 'ontology', markdown: ontology },
  { id: 'plugins', markdown: plugins },
  { id: 'composer', markdown: composer },
  { id: 'architecture', markdown: architecture },
  { id: 'react', markdown: react },
  { id: 'agents', markdown: agents },
  { id: 'superagent', markdown: superagent },
  { id: 'demo', markdown: demo },
  { id: 'next', markdown: next },
];

/** Where a slide embeds a diagram: the diagram's id in braces, replaced with a reference to its drawing. */
const PLACEHOLDER = /\{\{([a-z-]+)\}\}/g;

/** A slide's title, as the presenter labels it: its frontmatter's `title`, else its first heading, else its id. */
export const slideTitle = ({ id, markdown }: StudioSlide): string => Presentation.contentTitle(markdown) ?? id;

/** The name a diagram's drawing takes: the title of the slide that embeds it, or its id where none does. */
export const diagramTitle = (diagram: string): string => {
  const slide = STUDIO_SLIDES.find(({ markdown }) => markdown.includes(`{{${diagram}}}`));
  return slide ? slideTitle(slide) : diagram;
};

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

/** The commands a diagram's text draws; one that does not parse is a broken bundled file, so it throws. */
export const diagramCommands = ({ id, source }: StudioDiagram) => {
  const { commands, problems } = DSL.parse(source);
  const errors = problems.filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    throw new Error(`The ${id} diagram does not parse: ${errors.map(({ message }) => message).join(' · ')}`);
  }
  return commands;
};

const DESCRIPTION =
  'DXOS as canvas drawings: ECHO as a hyperspace of spaces, its layers, the ontology, the plugin model, Composer, ' +
  'the architecture, agents and their feeds, a chat and an agent at work.';

/**
 * The presentation: a slide per file of {@link STUDIO_SLIDES}, each `{{id}}` replaced with that diagram's drawing as
 * a space-relative reference, so the embed resolves in whatever space the template seeds.
 */
export const makeStudioDeck = (drawings: ReadonlyMap<string, Drawing.Drawing>): Presentation.Presentation =>
  Presentation.make({
    name: 'DXOS',
    description: DESCRIPTION,
    theme: { accent: '#2d6fff', font: 'space-grotesk', monoFont: 'fira' },
    slides: STUDIO_SLIDES.map(({ id, markdown }) =>
      markdown.replaceAll(PLACEHOLDER, (placeholder, diagram: string) => {
        const drawing = drawings.get(diagram);
        if (!drawing) {
          throw new Error(`The ${id} slide embeds an unknown diagram: ${placeholder}.`);
        }
        return EID.make({ entityId: drawing.id });
      }),
    ),
  });
