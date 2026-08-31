//
// Copyright 2026 DXOS.org
//

import { type Platform } from '../../plan';

export type EdgeStressSpec = {
  platform: Platform;
  edgeUrl: string;

  /** Devices per identity; its length is the identity count and its sum the client count. */
  devicesPerIdentity: number[];
  /** Create an EDGE agent per identity — an always-online member that can admit late joiners. */
  agents: boolean;

  maxSpaces: number;
  maxDocumentsPerSpace: number;
  maxCommands: number;
  /**
   * How many command lists to draw from the seed; the longest is executed. `FastCheck.assert`
   * biases its first run toward tiny inputs (measured: 2 commands), so drawing and picking is what
   * actually yields a long sequence — deterministically, since the seed fixes every draw.
   */
  sampleDraws: number;
  /** Wall-clock budget; exhausting it stops issuing commands and proceeds to the final assertion. */
  maxRuntimeMs: number;
  quiescenceTimeoutMs: number;
  /** Mid-run quiesce-and-assert over the online members. */
  checkpoints: boolean;
};

export type EdgeStressResult = {
  seed: string | undefined;
  commandsExecuted: number;
  spacesCreated: number;
  documentsCreated: number;
  setupTimeMs: number;
  runTimeMs: number;
};
