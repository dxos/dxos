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
import { ONTOLOGY } from './ontology.spec.ts';
import pluginsSource from './plugins.diagram?raw';
import pluginsModel from './plugins.json?raw';
import { type SlideSpec, seedSlideSpec } from './spec.ts';
import { type StudioModel, parseStudioModel, seedStudioSlide } from './studio.ts';

export type StudioSlide = {
  /** The slide's own name, which its files are named after. */
  id: string;
  /**
   * The slide said as groups of columns of cards ({@link SlideSpec}), which is drawn from the spec alone — the deck's
   * geometry and every pass that recovers structure from it are skipped.
   */
  spec?: SlideSpec;
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
  /** The slide's own columns, each a list of card ids. */
  columns?: readonly (readonly string[])[];
  /** The slide's own title, where the deck's does not read as this drawing does. */
  title?: string;
  /** Links the slide draws that the deck did not: the two cards and what the link says. */
  connect?: readonly (readonly [string, string, string])[];
  /** Texts the slide does not draw, by id. */
  hide?: readonly string[];
  /** How far above the deck's own place the slide's text sits, in scene units. */
  lift?: number;
  /** Cards the slide draws that the deck did not. */
  add?: readonly { id: string; title: string; icon: string }[];
  /** Links the slide does not draw, as the pair of cards they join. */
  unlink?: readonly (readonly [string, string])[];
  /** Links the slide aims at another card: the pair they join, then the card they end on instead. */
  relink?: readonly (readonly [string, string, string])[];
  /** How the slide's links are drawn; a slide this import re-lays out takes `ortho`. */
  links?: 'deck' | 'ortho';
  /** Which sides a routed link uses; a slide that fans out downwards takes `vertical`. */
  ports?: 'facing' | 'vertical';
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
 * The nine slides in the order they are presented, which is the studio repo's (`../slides/index.mjs`) with the
 * ontology moved up to follow the ECHO layers: the types it names are what those layers hold. Every sidecar records the same 1600 x 900 page, and a slide unit is a scene px, so the drawings are at one
 * scale: a card on one slide is the size of a card on another.
 */
export const STUDIO_SLIDES: readonly StudioSlide[] = [
  // The deck fitted three columns to one page; a drawing is not a page, so its columns take the air they read better
  // with, and the field sits in the middle of the two rather than where the deck's own margins left it.
  slide('hyperspace', hyperspaceSource, hyperspaceModel, { balance: true, spread: 1.12, links: 'ortho' }),
  slide('echo-layers', echoLayersSource, echoLayersModel, { links: 'ortho' }),
  // Declared rather than imported: three boxed groups, the entities in three columns about a Person. The deck's own
  // hand-placed graph and the passes that recovered columns from it are not used here.
  slide('ontology', ontologySource, ontologyModel, { spec: ONTOLOGY, title: ONTOLOGY.title }),
  slide('plugins', pluginsSource, pluginsModel, {
    labels: false,
    remap: { chip: 'card' },
    // The deck's header spanned the five columns under it; at a column and a half it reads as their parent.
    sizes: { plugin: { width: 400, height: 176 } },
    gap: 96,
    links: 'ortho',
    // One card over a row of them: every wire leaves its foot and lands on a head.
    ports: 'vertical',
  }),
  // The deck placed each side column where its content ended; balanced, the window sits in the middle of the two.
  slide('composer', composerSource, composerModel, { balance: true, gap: 96, links: 'ortho' }),
  slide('architecture', architectureSource, architectureModel, {
    labels: false,
    gap: 96,
    links: 'ortho',
    // The deck sized each card to its own text at a smaller body; at the deck's reading size they need the room,
    // and the slide has it.
    sizes: {
      ...Object.fromEntries(
        ['c-plugins', 'e-plugins', 'c-halo', 'e-halo', 'c-runtime', 'e-runtime', 'c-spaces', 'e-spaces'].map((id) => [
          id,
          { height: 136 },
        ]),
      ),
      // Two rows of chips and a footer under them.
      'c-services': { height: 208 },
      'e-services': { height: 208 },
    },
  }),
  // Four columns the deck fitted to a page: one gap between them, which is also what widens the drawing.
  slide('agents', agentsSource, agentsModel, {
    spaceGraph: true,
    labels: false,
    gap: 96,
    frames: ['subagents'],
    links: 'ortho',
  }),
  slide('chat', chatSource, chatModel, { links: 'ortho' }),
  slide('agent', agentSource, agentModel, { links: 'ortho' }),
];

export const studioSlide = (id: string): StudioSlide => {
  const found = STUDIO_SLIDES.find((slide) => slide.id === id);
  if (!found) {
    throw new Error(`No studio slide "${id}"; the deck has ${STUDIO_SLIDES.map(({ id }) => id).join(', ')}.`);
  }
  return found;
};

/**
 * The seeder for a slide: the spec where it declares one, the deck import otherwise. One place picks, so a story that
 * shows one slide and a story that shows nine do not each learn which slides are declared.
 */
export const seedSlide = (slide: StudioSlide) => {
  if (slide.spec) {
    return seedSlideSpec(slide.spec);
  }
  const { id: _id, source, model, spec: _spec, ...options } = slide;
  return seedStudioSlide(source, model, options);
};
