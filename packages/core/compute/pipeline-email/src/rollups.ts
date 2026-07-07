//
// Copyright 2026 DXOS.org
//

import { Message } from '@dxos/types';

import { deriveThreadId } from './threading';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Per-sender relationship aggregate (spec §3③ relationship rollups). Computed values, not ECHO
 * mutations: `Person` is a closed, canonical schema the pipeline must not write onto, so rollups are
 * consumed by the digest / callers (join back to a Person via the lowercased email and the
 * fact-index reconciliation table); materialization waits for a proper schema home.
 */
export type RelationshipRollup = {
  /** Lowercased sender address (email addresses are case-insensitive). */
  readonly email: string;
  readonly messageCount: number;
  readonly firstContact: string;
  readonly lastContact: string;
  /** Mean days between messages; absent below two messages. */
  readonly cadenceDays?: number;
  /** Threads this sender participated in (send-side), in first-seen order. */
  readonly threadIds: readonly string[];
};

/** Aggregate messages into per-sender rollups, most active sender first. Deterministic (Compute mode). */
export const buildRollups = (messages: readonly Message.Message[]): RelationshipRollup[] => {
  const bySender = new Map<string, { created: string[]; threadIds: string[] }>();
  for (const message of messages) {
    const email = message.sender.email?.toLowerCase();
    if (!email) {
      continue;
    }
    let entry = bySender.get(email);
    if (!entry) {
      entry = { created: [], threadIds: [] };
      bySender.set(email, entry);
    }
    entry.created.push(message.created);
    const threadId = deriveThreadId(message);
    if (!entry.threadIds.includes(threadId)) {
      entry.threadIds.push(threadId);
    }
  }

  const rollups: RelationshipRollup[] = [];
  for (const [email, entry] of bySender) {
    const ordered = [...entry.created].sort();
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const spanMs = new Date(last).getTime() - new Date(first).getTime();
    rollups.push({
      email,
      messageCount: ordered.length,
      firstContact: first,
      lastContact: last,
      ...(ordered.length >= 2 ? { cadenceDays: spanMs / (ordered.length - 1) / MS_PER_DAY } : {}),
      threadIds: entry.threadIds,
    });
  }
  return rollups.sort((a, b) => b.messageCount - a.messageCount || a.email.localeCompare(b.email));
};
