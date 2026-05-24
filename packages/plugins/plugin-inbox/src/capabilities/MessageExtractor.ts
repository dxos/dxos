//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Effect } from 'effect';

import { type Database, type Obj, type Relation } from '@dxos/echo';
import { type Message } from '@dxos/types';

export type MatchResult = {
  matched: boolean;
  confidence?: number;
  reason?: string;
};

export type ExtractCtx = {
  database: Database.Database;
  /** Optional target Trip (or other container) the extractor should append into. */
  targetTripId?: string;
};

export type ExtractResult = {
  created: Obj.Any[];
  relations: Relation.Unknown[];
  summary?: string;
};

export class ExtractError {
  readonly _tag = 'ExtractError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export interface MessageExtractor {
  readonly id: string;
  readonly description: string;
  readonly kinds: readonly string[];
  match(message: Message.Message): MatchResult;
  extract(ctx: ExtractCtx, message: Message.Message): Effect.Effect<ExtractResult, ExtractError>;
}
