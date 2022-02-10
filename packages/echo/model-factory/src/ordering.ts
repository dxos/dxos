import { PublicKey } from "@dxos/crypto";
import { Timeframe } from "@dxos/echo-protocol";
import { ModelMessage } from "./types";

/**
 * Ensures strong ordering of a mutation queue.
 * 
 * If appending a new mutation would break the strong order, it returns the proper index to insert the new mutation.
 * Otherwise it returns `exising.length`.
 */
export function getInsertionIndex(existing: ModelMessage<Uint8Array>[], newMutation: ModelMessage<Uint8Array>) {
  for (let i = 0; i < existing.length; i++) {
    const existingTimeframe = Timeframe.merge(existing[i].meta.timeframe, new Timeframe([[PublicKey.from(existing[i].meta.feedKey), existing[i].meta.seq - 1]]));
    const deps = Timeframe.dependencies(newMutation.meta.timeframe, existingTimeframe);
    if (deps.isEmpty()) {
      if(PublicKey.from(newMutation.meta.feedKey).toHex() < PublicKey.from(existing[i].meta.feedKey).toHex()) {
        return i;
      }
    }
  }
  return existing.length;
}