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
import chatSource from './chat.diagram?raw';
import chatModel from './chat.json?raw';
import ontologySource from './ontology.diagram?raw';
import ontologyModel from './ontology.json?raw';
import { type StudioModel, parseStudioModel } from './studio.ts';

export type StudioSlide = {
  /** The slide's own name, which its files are named after. */
  id: string;
  source: string;
  model: StudioModel;
  /** The drawing places a space graph, which a `Generator` draws when the story runs it as one. */
  spaceGraph?: boolean;
};

const slide = (id: string, source: string, model: string, rest: Omit<StudioSlide, 'id' | 'source' | 'model'> = {}) => ({
  id,
  source,
  model: parseStudioModel(model),
  ...rest,
});

/**
 * The slides in deck order. Rounds 1 and 2 brought four; the remaining five (Hyperspace, ECHO layers, Plugins,
 * Composer, Architecture) are exported from the studio repo's `assets/deck/canvas` and land here as they arrive.
 */
export const STUDIO_SLIDES: readonly StudioSlide[] = [
  slide('ontology', ontologySource, ontologyModel),
  slide('chat', chatSource, chatModel),
  slide('agent', agentSource, agentModel),
  slide('agents', agentsSource, agentsModel, { spaceGraph: true }),
];

export const studioSlide = (id: string): StudioSlide => {
  const found = STUDIO_SLIDES.find((slide) => slide.id === id);
  if (!found) {
    throw new Error(`No studio slide "${id}"; the deck has ${STUDIO_SLIDES.map(({ id }) => id).join(', ')}.`);
  }
  return found;
};
