import { TYPES } from "./gen";

export type DecodedAny<T extends keyof TYPES> = {
  // eslint-disable-next-line camelcase
  '@type': T,
} & TYPES[T]

/**
 * Union of all known protobuf message definitions with their FQN in the "@type" field.
 * Useful for selecting based on message type in switch-case statements.
 */
export type KnownAny = {
  [K in keyof TYPES]: DecodedAny<K>
}[keyof TYPES]
