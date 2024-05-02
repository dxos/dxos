//
// Copyright 2024 DXOS.org
//

import { type AbstractChainedBatch, type AbstractSublevel } from 'abstract-level';
import { Level } from 'level';

export type LevelDB = Level<string, string>;
export type SubLevelDB = AbstractSublevel<any, string | Buffer | Uint8Array, string, any>;
export type BatchLevel = AbstractChainedBatch<any, string, string>;

export const createLevel = (path: string): LevelDB => new Level<string, string>(path);
