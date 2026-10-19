//
// Copyright 2026 DXOS.org
//

import { trim } from '@dxos/util';

/**
 * Rules for passing information to someone who was not in the conversation it came from; shared by the
 * skills that relay and notify and by the composer of watch updates, so every message follows them.
 */
export const RELAY_RULES = trim`
  - The message must stand alone: resolve every pronoun and reference ("it", "that", "the fix") to what it means, using the conversation.
  - Answer what the requester asked for (e.g. what Dima is working on), not the literal words said; lead with it.
  - Say who it came from, and who else is involved when relevant; say when only if it was not just now.
  - Paraphrase; quote only short phrases when the exact words matter. Never forward a bare fragment.
  - One or two sentences, no preamble, written to the recipient by name or "you".
  - If something is unclear, say what is known and what is not; never invent detail.
  - Don't pass on anything a recorded instruction or preference says not to share.
`;
