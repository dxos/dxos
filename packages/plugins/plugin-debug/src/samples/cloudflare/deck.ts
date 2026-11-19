//
// Copyright 2026 DXOS.org
//

import { DSL } from '@dxos/diagram';
import { EID } from '@dxos/echo';
import type * as Canvas from '@dxos/plugin-canvas/Canvas';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import agentsDiagram from './diagrams/agents.dx?raw';
import appDiagram from './diagrams/app.dx?raw';
import architectureDiagram from './diagrams/architecture.dx?raw';
import echoDiagram from './diagrams/echo.dx?raw';
import hyperspaceDiagram from './diagrams/hyperspace.dx?raw';
import pluginsDiagram from './diagrams/plugins.dx?raw';
import problemDiagram from './diagrams/problem.dx?raw';
import reactDiagram from './diagrams/react.dx?raw';
import superagentDiagram from './diagrams/superagent.dx?raw';
import agents from './slides/agents.md?raw';
import app from './slides/app.md?raw';
import architecture from './slides/architecture.md?raw';
import cover from './slides/cover.md?raw';
import demo from './slides/demo.md?raw';
import echo from './slides/echo.md?raw';
import evolution from './slides/evolution.md?raw';
import hyperspace from './slides/hyperspace.md?raw';
import next from './slides/next.md?raw';
import opportunity from './slides/opportunity.md?raw';
import plugins from './slides/plugins.md?raw';
import problem from './slides/problem.md?raw';
import react from './slides/react.md?raw';
import stack from './slides/stack.md?raw';
import superagent from './slides/superagent.md?raw';

/** A diagram the deck draws: its text, written as intent (`diagram kind=grid`), and the id a slide embeds it by. */
export type Diagram = { id: string; source: string };

/** A slide of the deck: a markdown file in the presenter's dialect, titled by its frontmatter or its first heading. */
export type Slide = { id: string; markdown: string };

/** The diagrams, each drawn once and listed in the order the slides show them; a slide embeds one by naming it (`<Surface ref="{{echo}}" />`). */
export const DIAGRAMS: readonly Diagram[] = [
  { id: 'react', source: reactDiagram },
  { id: 'agents', source: agentsDiagram },
  { id: 'superagent', source: superagentDiagram },
  { id: 'problem', source: problemDiagram },
  { id: 'echo', source: echoDiagram },
  { id: 'hyperspace', source: hyperspaceDiagram },
  { id: 'app', source: appDiagram },
  { id: 'plugins', source: pluginsDiagram },
  { id: 'architecture', source: architectureDiagram },
];

/** The slides in the order they are presented; `slides/<id>.md` is where a title or a note is changed. */
export const SLIDES: readonly Slide[] = [
  { id: 'cover', markdown: cover },
  { id: 'stack', markdown: stack },
  { id: 'opportunity', markdown: opportunity },
  { id: 'evolution', markdown: evolution },
  { id: 'react', markdown: react },
  { id: 'agents', markdown: agents },
  { id: 'superagent', markdown: superagent },
  { id: 'problem', markdown: problem },
  { id: 'echo', markdown: echo },
  { id: 'hyperspace', markdown: hyperspace },
  { id: 'app', markdown: app },
  { id: 'plugins', markdown: plugins },
  { id: 'architecture', markdown: architecture },
  { id: 'demo', markdown: demo },
  { id: 'next', markdown: next },
  { id: 'cover', markdown: cover },
];

/** Where a slide embeds a diagram: the diagram's id in braces, replaced with a reference to its drawing. */
const PLACEHOLDER = /\{\{([a-z-]+)\}\}/g;

/** A slide's title, as the presenter labels it: its frontmatter's `title`, else its first heading, else its id. */
export const slideTitle = ({ id, markdown }: Slide): string => Presentation.contentTitle(markdown) ?? id;

/** The name a diagram's drawing takes: the title of the slide that embeds it, or its id where none does. */
export const diagramTitle = (diagram: string): string => {
  const slide = SLIDES.find(({ markdown }) => markdown.includes(`{{${diagram}}}`));
  return slide ? slideTitle(slide) : diagram;
};

/** The page a diagram states unless it needs another: a slide fits the page whole, so one page is one card size across slides. */
export const STUDIO_PAGE = { x: 0, y: 0, width: 1600, height: 880 } as const;

/** The frame a diagram's slide fits, as its own text states it: a wider page uses the slide's width, a smaller one draws larger. */
export const diagramPage = ({ source }: Diagram) => {
  const [, width, height] = source.match(/\bsize=(\d+)x(\d+)\b/) ?? [];
  return width && height ? { x: 0, y: 0, width: Number(width), height: Number(height) } : STUDIO_PAGE;
};

/** How far a slide may magnify the page. A fit stops at 1:1 by default, and a slide is wider than the page. */
const FIT_ZOOM = 4;

/**
 * The canvas a slide is drawn on: the deck's look, its 8px pitch, and the diagram's page as what a fit frames. The
 * Neu ground draws no grid of its own, so `backgroundGrid` gives the drawing something to place against.
 */
export const studioCanvas = (diagram: Diagram): Partial<Canvas.CanvasSettings> => ({
  styleSet: 'neu',
  background: 'neu',
  grid: 8,
  backgroundGrid: 'dots',
  fitFrame: diagramPage(diagram),
  fitZoom: FIT_ZOOM,
});

/** The commands a diagram's text draws; one that does not parse is a broken bundled file, so it throws. */
export const diagramCommands = ({ id, source }: Diagram) => {
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
 * The presentation: a slide per file of {@link SLIDES}, each `{{id}}` replaced with that diagram's drawing as
 * a space-relative reference, so the embed resolves in whatever space the template seeds.
 */
export const makeStudioDeck = (drawings: ReadonlyMap<string, Drawing.Drawing>): Presentation.Presentation =>
  Presentation.make({
    name: 'DXOS',
    description: DESCRIPTION,
    theme: { accent: '#2d6fff', heading: '#06c5fd', subheading: '#ff7a45', font: 'space-grotesk', monoFont: 'fira' },
    slides: SLIDES.map(({ id, markdown }) =>
      markdown.replaceAll(PLACEHOLDER, (placeholder, diagram: string) => {
        const drawing = drawings.get(diagram);
        if (!drawing) {
          throw new Error(`The ${id} slide embeds an unknown diagram: ${placeholder}.`);
        }
        return EID.make({ entityId: drawing.id });
      }),
    ),
  });
