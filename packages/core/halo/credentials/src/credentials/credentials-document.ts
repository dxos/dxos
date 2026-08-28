//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

// Resolved on first use, not at import: building the codec generates a mapper from source, which
// workerd rejects as codegen-from-strings, and this module is reachable from a worker bundle.
let credentialCodec: ReturnType<typeof schema.getCodecForType<'dxos.halo.credentials.Credential'>> | undefined;
const getCredentialCodec = () => (credentialCodec ??= schema.getCodecForType('dxos.halo.credentials.Credential'));

/** Versioned DXN in the same form `EntitySystem.type` carries. */
export const CREDENTIALS_DOCUMENT_TYPE = 'dxn:org.dxos.document.spaceCredentials:0.1.0';

/**
 * Holds only the encoded credential, so nothing outside the signature can influence how it is
 * processed, and flat rather than nested because a nested map cannot be recovered from the automerge
 * change history that makes the set append-only.
 */
export type CredentialsDocumentEntry = Uint8Array;

/**
 * The credential chain of a space, replacing its control feed. Keyed by credential id so an append is
 * idempotent and concurrent appends converge instead of racing for an index.
 */
export type CredentialsDocument = {
  type: typeof CREDENTIALS_DOCUMENT_TYPE;

  spaceId: SpaceId;

  credentials: { [credentialId: string]: CredentialsDocumentEntry };
};

export const isCredentialsDocument = (doc: unknown): doc is CredentialsDocument =>
  typeof doc === 'object' && doc !== null && (doc as CredentialsDocument).type === CREDENTIALS_DOCUMENT_TYPE;

export type OrderedCredential = { id: string; credential: Credential };

/**
 * Total order every peer computes identically, since an Automerge map has no inherent one and the state
 * machine must see a credential after the ones it depends on. Takes the already-read entries rather
 * than the document, so this package needs no automerge dependency to order them.
 *
 * Every ordering input is read from the encoded credential rather than from the entry around it, so a
 * peer cannot reorder processing by editing the document: altering those fields invalidates the
 * signature the state machine checks. An entry whose key disagrees with the credential it holds, or
 * which does not decode, is dropped for the same reason.
 *
 * `parentCredentialIds` win over `issuanceDate`, since clock skew across devices can date a parent after
 * its child. A parent that has not replicated yet does not block its child — the state machine rejects a
 * chain it cannot verify, so ordering need not enforce that too.
 */
export const orderCredentials = (encoded: ReadonlyMap<string, CredentialsDocumentEntry>): OrderedCredential[] => {
  const entries: OrderedCredential[] = [];
  for (const [id, entry] of encoded) {
    const credential = decodeCredential(id, entry);
    if (credential) {
      entries.push({ id, credential });
    }
  }

  const byTiebreak = (a: OrderedCredential, b: OrderedCredential) => {
    // Genesis roots the chain and carries no parent link, and it is issued in the same millisecond as
    // the first membership credential — so without this the id tiebreak decides, and half the time the
    // state machine sees a member admitted into a space that does not exist yet.
    const genesis = rankGenesis(a.credential) - rankGenesis(b.credential);
    if (genesis !== 0) {
      return genesis;
    }

    const issuance = a.credential.issuanceDate.getTime() - b.credential.issuanceDate.getTime();
    return issuance === 0 ? a.id.localeCompare(b.id) : issuance;
  };

  const present = new Set(entries.map(({ id }) => id));
  const pending = new Map(
    entries.map(({ id, credential }) => [
      id,
      new Set(
        (credential.parentCredentialIds ?? []).map((parent) => parent.toHex()).filter((parent) => present.has(parent)),
      ),
    ]),
  );

  const ordered: OrderedCredential[] = [];
  const remaining = [...entries].sort(byTiebreak);
  while (remaining.length > 0) {
    const index = remaining.findIndex(({ id }) => pending.get(id)!.size === 0);
    if (index === -1) {
      // Signing makes a parent cycle impossible, so emit the rest rather than drop credentials.
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

const rankGenesis = (credential: Credential): number =>
  credential.subject?.assertion?.['@type'] === 'dxos.halo.credentials.SpaceGenesis' ? 0 : 1;

const decodeCredential = (id: string, entry: CredentialsDocumentEntry): Credential | undefined => {
  let credential: Credential;
  try {
    credential = getCredentialCodec().decode(entry);
  } catch (err) {
    log.warn('undecodable credential entry', { id, err });
    return undefined;
  }

  if (credential.id?.toHex() !== id) {
    log.warn('credential entry keyed by something other than its credential id', { id });
    return undefined;
  }

  return credential;
};
