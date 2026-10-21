//
// Copyright 2026 DXOS.org
//

import type { Env } from './worker.mjs';

/** A push check's verdict (D201), kept at `<project>/checks/<causal>.json`. */
export type HistoryCheck = { check: 'history'; causal: string; previous?: string; ok: boolean; why: string };

export declare const checkHistory: (env: Env, project: string, branch: string, causal: string) => Promise<HistoryCheck>;
