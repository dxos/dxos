//
// Copyright 2026 DXOS.org
//

//
// Every studio deck slide the spike has imported, in deck order: its DSL, its sidecar, and what the drawing needs
// from the host to draw it. One list, because a story that shows a slide, two themes of it, or the whole deck
// otherwise repeats the same three imports per slide — which does not survive nine of them.
//
// Story-only: the sources are `?raw` imports, which the node tests cannot take (`studio.test.ts` reads the same
// files off disk instead).
//

import agentSource from './agent.diagram?raw';
import agentModel from './agent.json?raw';
import agentsSource from './agents.diagram?raw';
import agentsModel from './agents.json?raw';
import architectureSource from './architecture.diagram?raw';
import architectureModel from './architecture.json?raw';
import chatSource from './chat.diagram?raw';
import chatModel from './chat.json?raw';
import composerSource from './composer.diagram?raw';
import composerModel from './composer.json?raw';
import echoLayersSource from './echo-layers.diagram?raw';
import echoLayersModel from './echo-layers.json?raw';
import hyperspaceSource from './hyperspace.diagram?raw';
import hyperspaceModel from './hyperspace.json?raw';
import ontologySource from './ontology.diagram?raw';
import ontologyModel from './ontology.json?raw';
import pluginsSource from './plugins.diagram?raw';
import pluginsModel from './plugins.json?raw';
import { type StudioModel, parseStudioModel } from './studio.ts';

export type StudioSlide = {
  /** The slide's own name, which its files are named after. */
  id: string;
  source: string;
  model: StudioModel;
  /** The drawing places a space graph, which a `Generator` draws when the story runs it as one. */
  spaceGraph?: boolean;
  /**
   * The slide's free-floating text is drawn. Off where the boxes already say it: the deck set these by eye, so a
   * column heading, a link's caption or a frame's title is placed where nothing in the drawing holds it.
   */
  labels?: boolean;
  /**
   * Remaps the element kinds the sidecar names, by kind: the Plugins slide records its module consumers as the deck's
   * pills, and they read as cards of the module above (one column, one width).
   */
  remap?: Readonly<Record<string, string>>;
  /** How far the slide's columns are pulled apart about its centre; unset leaves the deck's own spacing. */
  spread?: number;
  /** The slide's columns are made symmetrical about its centre. */
  balance?: boolean;
  /** One gap between every column of the slide, in scene units. */
  gap?: number;
  /** Frames the slide does not draw, by id. */
  frames?: readonly string[];
  /** Every card of the slide is drawn at one size. */
  uniform?: boolean;
  /** A card the slide draws at a size of its own, by its id. */
  sizes?: Readonly<Record<string, { width?: number; height?: number }>>;
};

const slide = (id: string, source: string, model: string, rest: Omit<StudioSlide, 'id' | 'source' | 'model'> = {}) => ({
  id,
  source,
  model: parseStudioModel(model),
  ...rest,
});

/**
 * The nine slides in deck order (`s1 hyperspace` … `s9 agent`), as the studio repo's `../slides/index.mjs` lists
 * them. Every sidecar records the same 1600 x 900 page, and a slide unit is a scene px, so the drawings are at one
 * scale: a card on one slide is the size of a card on another.
 */
export const STUDIO_SLIDES: readonly StudioSlide[] = [
  // The deck fitted three columns to one page; a drawing is not a page, so its columns take the air they read better
  // with, and the field sits in the middle of the two rather than where the deck's own margins left it.
  slide('hyperspace', hyperspaceSource, hyperspaceModel, { balance: true, spread: 1.12 }),
  slide('echo-layers', echoLayersSource, echoLayersModel),
  slide('plugins', pluginsSource, pluginsModel, {
    labels: false,
    remap: { chip: 'card' },
    // The deck's header spanned the five columns under it; at a column and a half it reads as their parent.
    sizes: { plugin: { width: 400, height: 176 } },
    gap: 96,
  }),
  // The deck placed each side column where its content ended; balanced, the window sits in the middle of the two.
  slide('composer', composerSource, composerModel, { balance: true }),
  slide('architecture', architectureSource, architectureModel, { labels: false, gap: 96 }),
  // Four columns the deck fitted to a page: one gap between them, which is also what widens the drawing.
  slide('agents', agentsSource, agentsModel, { spaceGraph: true, labels: false, gap: 96, frames: ['subagents'] }),
  // Every card is a type, so every card is one box; the deck sized each to its own label.
  slide('ontology', ontologySource, ontologyModel, { uniform: true }),
  slide('chat', chatSource, chatModel),
  slide('agent', agentSource, agentModel),
];

export const studioSlide = (id: string): StudioSlide => {
  const found = STUDIO_SLIDES.find((slide) => slide.id === id);
  if (!found) {
    throw new Error(`No studio slide "${id}"; the deck has ${STUDIO_SLIDES.map(({ id }) => id).join(', ')}.`);
  }
  return found;
};
