//
// Copyright 2024 DXOS.org
//

import { type AbstractChainedBatch, type AbstractSublevel } from 'abstract-level';
import { Level } from 'level';

// TODO(burdon): Caution not to obfuscate low level types with inconsistent wrappers.
export type LevelDB = Level<string, string>;
export type SublevelDB = AbstractSublevel<any, string | Buffer | Uint8Array, string, any>;
export type BatchLevel = AbstractChainedBatch<any, string, string>;

// TODO(burdon): Replace this lib with just typings?
export const createLevel = (path: string): LevelDB => new Level<string, string>(path);
