//
// Copyright 2026 DXOS.org
//

/**
 * Reads the checkpoint list out of a stored, signed sedimentree fragment record.
 *
 * `@automerge/automerge-subduction` 0.17.x does not expose a fragment's checkpoints to JS, so a
 * fragment that lists its own head as a checkpoint (the shape every client on `@automerge/automerge`
 * < 3.5 wrote, automerge/automerge#1559) can only be recognized from the record bytes. Such a
 * fragment never contributes a head to `getAllHeads()` (inkandswitch/subduction#306), which is
 * what makes a document look unsynced forever.
 *
 * Record layout, as produced by `SignedFragment.encode()`:
 *
 * ```
 * "STF\0"[4] issuer[32] sedimentreeId[32] head[32] blobDigest[32]
 * boundaryCount:u8 checkpointCount:u16be blobSize:bijou64
 * boundary[32]×boundaryCount checkpoints[12]×checkpointCount signature[64]
 * ```
 *
 * Nothing here verifies the signature: the bytes are only inspected, never trusted as a fragment.
 * The rewrite that follows a positive match goes through the engine, which re-signs the record.
 */

const MAGIC = [0x53, 0x54, 0x46, 0x00];
const ID_LENGTH = 32;
const CHECKPOINT_PREFIX_LENGTH = 12;
const SIGNATURE_LENGTH = 64;
const HEADER_LENGTH = MAGIC.length + ID_LENGTH * 4 + 1 + 2;

export type SignedFragmentRecord = {
  issuer: Uint8Array;
  sedimentreeId: Uint8Array;
  head: Uint8Array;
  blobDigest: Uint8Array;
  boundary: Uint8Array[];
  /** Checkpoints as stored: {@link CHECKPOINT_PREFIX_LENGTH}-byte id prefixes. */
  checkpoints: Uint8Array[];
};

/**
 * Byte width of a bijou64 varint from its first byte: one byte below `0xf8`, otherwise the first
 * byte names the total width.
 */
const bijou64Width = (firstByte: number): number => (firstByte < 0xf8 ? 1 : firstByte - 0xf6);

/**
 * Parses a signed fragment record. Returns `undefined` for anything that is not exactly one
 * well-formed record (wrong magic, truncated, or trailing bytes), so a caller can skip it.
 */
export const parseSignedFragmentRecord = (bytes: Uint8Array): SignedFragmentRecord | undefined => {
  if (bytes.length < HEADER_LENGTH + 1 + SIGNATURE_LENGTH) {
    return undefined;
  }
  if (!MAGIC.every((byte, index) => bytes[index] === byte)) {
    return undefined;
  }
  let offset = MAGIC.length;
  const readId = (): Uint8Array => {
    const id = bytes.subarray(offset, offset + ID_LENGTH);
    offset += ID_LENGTH;
    return id;
  };
  const issuer = readId();
  const sedimentreeId = readId();
  const head = readId();
  const blobDigest = readId();
  const boundaryCount = bytes[offset];
  offset += 1;
  const checkpointCount = (bytes[offset] << 8) | bytes[offset + 1];
  offset += 2;
  offset += bijou64Width(bytes[offset]);
  const expectedLength =
    offset + boundaryCount * ID_LENGTH + checkpointCount * CHECKPOINT_PREFIX_LENGTH + SIGNATURE_LENGTH;
  if (bytes.length !== expectedLength) {
    return undefined;
  }
  const boundary: Uint8Array[] = [];
  for (let index = 0; index < boundaryCount; index++) {
    boundary.push(readId());
  }
  const checkpoints: Uint8Array[] = [];
  for (let index = 0; index < checkpointCount; index++) {
    checkpoints.push(bytes.subarray(offset, offset + CHECKPOINT_PREFIX_LENGTH));
    offset += CHECKPOINT_PREFIX_LENGTH;
  }
  return { issuer, sedimentreeId, head, blobDigest, boundary, checkpoints };
};

export type SelfCheckpointRepair = {
  head: Uint8Array;
  boundary: Uint8Array[];
  /** Digest of the stored blob, for a caller to check the blob it reuses against. */
  blobDigest: Uint8Array;
  /**
   * The checkpoints to store instead: every stored prefix that is neither the head nor a boundary
   * id, zero-padded to a full id. The engine truncates ids back to the stored prefix width, so the
   * padding round-trips losslessly.
   */
  checkpoints: Uint8Array[];
};

const prefixMatches = (prefix: Uint8Array, id: Uint8Array): boolean =>
  prefix.every((byte, index) => id[index] === byte);

/**
 * Detects a self-checkpointed fragment record and computes the valid shape to rewrite it into:
 * same head and boundary, checkpoints without the head and without the boundary ids. Returns
 * `undefined` when the record does not parse or does not list its own head as a checkpoint.
 */
export const selfCheckpointRepair = (bytes: Uint8Array): SelfCheckpointRepair | undefined => {
  const record = parseSignedFragmentRecord(bytes);
  if (!record) {
    return undefined;
  }
  const isHead = (prefix: Uint8Array) => prefixMatches(prefix, record.head);
  if (!record.checkpoints.some(isHead)) {
    return undefined;
  }
  const isBoundary = (prefix: Uint8Array) => record.boundary.some((id) => prefixMatches(prefix, id));
  const checkpoints = record.checkpoints
    .filter((prefix) => !isHead(prefix) && !isBoundary(prefix))
    .map((prefix) => {
      const id = new Uint8Array(ID_LENGTH);
      id.set(prefix);
      return id;
    });
  return { head: record.head, boundary: record.boundary, blobDigest: record.blobDigest, checkpoints };
};
