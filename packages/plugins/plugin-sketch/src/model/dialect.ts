//
// Copyright 2026 DXOS.org
//

//
// Extension point for higher-level diagram languages (mermaid, d2, sequence, uml-class, …).
// A dialect compiles its input into scene edit commands — owning any layout it needs — so its
// output lands as ordinary world objects and stays editable by id. Mirrors the architecture
// shared by Mermaid/D2/Kroki: dialect → intermediate positioned model → renderer.
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';

import * as Scene from './scene';

export type Dialect<Input = any> = {
  id: string;
  description: string;
  input: Schema.Schema<Input, any>;
  compile: (input: Input) => Effect.Effect<readonly Scene.Command[]>;
};

/** The core dialect: input is already scene edit commands (identity compile). */
export const sceneDialect: Dialect<readonly Scene.Command[]> = {
  id: 'scene',
  description: 'Positioned world objects and elements; the agent does the layout.',
  input: Schema.Array(Scene.Command),
  compile: Effect.succeed,
};

export class DialectRegistry {
  readonly #dialects = new Map<string, Dialect>();

  constructor(dialects: Dialect[] = [sceneDialect]) {
    dialects.forEach((dialect) => this.register(dialect));
  }

  register(dialect: Dialect): void {
    invariant(!this.#dialects.has(dialect.id), `duplicate dialect: ${dialect.id}`);
    this.#dialects.set(dialect.id, dialect);
  }

  get(id: string): Dialect | undefined {
    return this.#dialects.get(id);
  }

  list(): Dialect[] {
    return [...this.#dialects.values()];
  }
}
