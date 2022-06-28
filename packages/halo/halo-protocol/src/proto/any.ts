import { TYPES } from "./gen";

/**
 * Union of all known protobuf message definitions with their FQN in the "@type" field.
 * Useful for selecting based on message type in switch-case statements.
 */
export type KnownAny = {
  [K in keyof TYPES]: {
  // eslint-disable-next-line camelcase
  '@type': K,
} & TYPES[K]
}[keyof TYPES]
