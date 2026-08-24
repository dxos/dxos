//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

/** Versioned DXN in the same form `EntitySystem.type` carries. */
export const CREDENTIALS_DOCUMENT_TYPE = 'dxn:org.dxos.document.spaceCredentials:0.1.0';

/**
 * One credential as stored in the document. `data` is the encoded credential exactly as the control
 * feed stores it; the other fields are mirrored out of it so ordering never has to decode the payload.
 */
export type CredentialsDocumentEntry = {
  data: Uint8Array;

  /** ISO-8601, from `Credential.issuanceDate`. */
  issuanceDate: string;

  /** Hex ids from `Credential.parentCredentialIds` — credentials this one must be processed after. */
  parents?: string[];
};

/**
 * The credential chain of a space, replacing its control feed.
 *
 * Credentials are keyed by id rather than held in an array: an append is then idempotent (a credential
 * is content-addressed by its signature, so re-adding one is a no-op) and two devices appending
 * concurrently converge instead of racing for an index.
 */
export type CredentialsDocument = {
  type: typeof CREDENTIALS_DOCUMENT_TYPE;

  spaceId: SpaceId;

  credentials: { [credentialId: string]: CredentialsDocumentEntry };
};

export const isCredentialsDocument = (doc: unknown): doc is CredentialsDocument =>
  typeof doc === 'object' && doc !== null && (doc as CredentialsDocument).type === CREDENTIALS_DOCUMENT_TYPE;

type OrderedCredential = { id: string; entry: CredentialsDocumentEntry };

/**
 * Total order every peer computes identically, since an Automerge map has no inherent one and the state
 * machine must see a credential after the credentials it depends on.
 *
 * Declared dependencies (`parents`) win; ties break on `(issuanceDate, id)`, both of which are fixed when
 * the credential is signed. A parent that has not replicated yet is ignored rather than blocking its
 * child — the state machine rejects a credential whose chain it cannot verify, so ordering does not need
 * to enforce that too.
 */
export const orderCredentials = (doc: CredentialsDocument): OrderedCredential[] => {
  const entries = Object.entries(doc.credentials ?? {}).map(([id, entry]) => ({ id, entry }));
  const byTiebreak = (a: OrderedCredential, b: OrderedCredential) =>
    a.entry.issuanceDate === b.entry.issuanceDate
      ? a.id.localeCompare(b.id)
      : a.entry.issuanceDate.localeCompare(b.entry.issuanceDate);

  const present = new Set(entries.map(({ id }) => id));
  const pending = new Map(
    entries.map(({ id, entry }) => [id, new Set((entry.parents ?? []).filter((parent) => present.has(parent)))]),
  );

  const ordered: OrderedCredential[] = [];
  const remaining = [...entries].sort(byTiebreak);
  while (remaining.length > 0) {
    const index = remaining.findIndex(({ id }) => pending.get(id)!.size === 0);
    if (index === -1) {
      // Only reachable if the parent links form a cycle, which signing makes impossible; emitting the rest
      // in tiebreak order keeps every credential rather than dropping it on a malformed document.
      log.warn('cycle in credential parents, falling back to tiebreak order', { remaining: remaining.length });
      ordered.push(...remaining);
      break;
    }

    const [next] = remaining.splice(index, 1);
    ordered.push(next);
    for (const parents of pending.values()) {
      parents.delete(next.id);
    }
  }

  return ordered;
};
