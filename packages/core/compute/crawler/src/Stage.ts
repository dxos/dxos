//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { SemanticStore } from '@dxos/semantic-index';

import { AgentRegistry } from './AgentRegistry';
import { type StageError } from './errors';
import { StateStore } from './StateStore';
import type * as Type from './types';

/** Services a stage may draw from the Effect context. */
export type Env = SemanticStore | AiService.AiService | AgentRegistry | StateStore;

/**
 * One step of the configurable pipeline. Stages declare which events they consume; the crawl loop
 * runs them in order per event. A stage failure is isolated (recorded on the target), so a bad
 * stage on one message never aborts the crawl.
 */
export interface Stage {
  readonly name: string;
  /** Event tags this stage reacts to. */
  readonly handles: ReadonlyArray<Type.EventTag>;
  readonly apply: (event: Type.Event) => Effect.Effect<void, StageError, Env>;
}
