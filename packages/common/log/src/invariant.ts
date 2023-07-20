import { CallMetadata } from "./meta";

export type InvariantFn = (condition: unknown, message?: string, meta?: CallMetadata) => asserts condition;

export const invariant: InvariantFn = (condition: unknown, message?: string, meta?: CallMetadata): asserts condition => {
  // TODO(dmaretskyi): .
}