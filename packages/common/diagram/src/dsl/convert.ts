//
// Copyright 2026 DXOS.org
//

//
// Text in another diagram language, out as ours. Every source language already compiles to
// `Scene.Command[]`, and the DSL already prints those, so a converter is the two halves joined —
// which is why adding a dialect costs nothing here.
//
// The output is the POST-layout form, and there is no other option: the DSL has no unpositioned
// node to emit. That is the point of converting — you run mermaid once to get a layout, then keep
// the result as something you can hand-tune, diff and review. See `docs/DSL.md`.
//

import * as Effect from 'effect/Effect';

import * as MermaidEngine from '../mermaid-engine.ts';
import * as Mermaid from '../mermaid.ts';
import type * as Scene from '../scene.ts';
import * as Uml from '../uml.ts';
import { printCommands } from './print.ts';

/** A source language that can be turned into DSL text. */
export type Source = {
  id: string;
  description: string;
  /** True when a source string looks like this language, for `convert` to pick without being told. */
  detect: (source: string) => boolean;
  compile: (source: string) => Effect.Effect<readonly Scene.Command[]>;
};

/** Mermaid `classDiagram`, laid out synchronously by the UML engine. */
export const umlSource: Source = {
  id: 'uml',
  description: 'Mermaid classDiagram.',
  detect: Uml.isClassDiagram,
  compile: (source) => Effect.sync(() => Uml.compile(source)),
};

/**
 * Mermaid `flowchart`, laid out by the ELK-backed engine. ELK is promise-based, so the platform
 * boundary sits here rather than leaking a Promise into the rest of the pipeline.
 */
export const mermaidSource: Source = {
  id: 'mermaid',
  description: 'Mermaid flowchart, including the `%% ref` and UML edge-token extensions.',
  detect: (source) => /^\s*(flowchart|graph)\s+/m.test(source),
  compile: (source) => Effect.promise(() => MermaidEngine.compile(source)),
};

/** Mermaid flowchart without the ELK pass — the simple layered placement in `mermaid.ts`. */
export const mermaidLayeredSource: Source = {
  id: 'mermaid-layered',
  description: "Mermaid flowchart with the dialect's own layered placement rather than ELK.",
  detect: () => false,
  compile: (source) => Effect.sync(() => Mermaid.compile(source)),
};

export const SOURCES: readonly Source[] = [umlSource, mermaidSource, mermaidLayeredSource];

/** The language a source string is written in, or undefined when nothing claims it. */
export const detect = (source: string): Source | undefined => SOURCES.find(({ detect }) => detect(source));

export class UnknownSourceError extends Error {
  constructor(id: string) {
    super(`Unknown source language "${id}"; known: ${SOURCES.map(({ id }) => id).join(', ')}.`);
  }
}

export class UndetectedSourceError extends Error {
  constructor() {
    super('Could not tell what language this is; pass one of: ' + SOURCES.map(({ id }) => id).join(', ') + '.');
  }
}

export type ConvertOptions = {
  /** Force a language instead of detecting one. */
  source?: string;
};

/** Compiles `text` through its dialect and prints the result as DSL text. */
export const convert = (
  text: string,
  { source }: ConvertOptions = {},
): Effect.Effect<string, UnknownSourceError | UndetectedSourceError> =>
  Effect.gen(function* () {
    const language = source === undefined ? detect(text) : SOURCES.find(({ id }) => id === source);
    if (!language) {
      return yield* Effect.fail(source === undefined ? new UndetectedSourceError() : new UnknownSourceError(source));
    }
    return printCommands(yield* language.compile(text));
  });
