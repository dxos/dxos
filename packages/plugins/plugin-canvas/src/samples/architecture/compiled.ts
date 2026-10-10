//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Scene } from '@dxos/diagram';

import compiled from './compiled.json?raw';

/** Each diagram's compiled scene commands, by diagram id. */
export const CompiledDiagrams = Schema.Record(Schema.String, Schema.Array(Scene.Command));
export type CompiledDiagrams = Schema.Schema.Type<typeof CompiledDiagrams>;

/**
 * The diagrams as laid out ahead of time from their `.dx` sources (`compiled.test.ts` keeps them current): laying a
 * diagram out takes up to a second, so a template that compiled twelve at runtime kept its space waiting.
 */
export const DIAGRAM_COMMANDS: CompiledDiagrams = Schema.decodeUnknownSync(CompiledDiagrams)(JSON.parse(compiled));
