//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey, SpaceId } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import {
  CREDENTIALS_DOCUMENT_TYPE,
  type CredentialsDocument,
  isCredentialsDocument,
  orderCredentials,
} from './credentials-document';

describe('credentials document', () => {
  test('orders by issuance date, breaking ties on id', () => {
    const early = credential('2026-01-01T00:00:00.000Z');
    const later = credential('2026-01-03T00:00:00.000Z');
    const sameDate = credential('2026-01-01T00:00:00.000Z');

    const ordered = orderCredentials(entries([later, early, sameDate]));
    const [first, second] = [early, sameDate].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));

    expect(ordered.map(({ id }) => id)).to.deep.equal([keyOf(first), keyOf(second), keyOf(later)]);
  });

  test('converges regardless of the order entries were appended in', () => {
    const first = credential('2026-01-01T00:00:00.000Z');
    const second = credential('2026-01-02T00:00:00.000Z', [first.id!]);

    const forwards = orderCredentials(entries([first, second]));
    const backwards = orderCredentials(entries([second, first]));

    expect(forwards.map(({ id }) => id)).to.deep.equal(backwards.map(({ id }) => id));
  });

  test('a parent is processed before its child even when issued later', () => {
    // Clock skew across devices can date a parent after its child; the signed dependency wins.
    const parent = credential('2026-01-05T00:00:00.000Z');
    const child = credential('2026-01-01T00:00:00.000Z', [parent.id!]);

    const ordered = orderCredentials(entries([child, parent]));
    expect(ordered.map(({ id }) => id)).to.deep.equal([keyOf(parent), keyOf(child)]);
  });

  test('a parent that has not replicated yet does not block its child', () => {
    const child = credential('2026-01-01T00:00:00.000Z', [PublicKey.random()]);

    const ordered = orderCredentials(entries([child]));
    expect(ordered.map(({ id }) => id)).to.deep.equal([keyOf(child)]);
  });

  test('an entry keyed by something other than its credential id is dropped', () => {
    const real = credential('2026-01-01T00:00:00.000Z');
    const misKeyed = new Map([[PublicKey.random().toHex(), entries([real]).get(keyOf(real))!]]);

    expect(orderCredentials(misKeyed)).to.deep.equal([]);
  });

  test('an undecodable entry is dropped rather than throwing', () => {
    const undecodable = new Map([[PublicKey.random().toHex(), new Uint8Array([0xff, 0xff, 0xff, 0xff])]]);

    expect(orderCredentials(undecodable)).to.deep.equal([]);
  });

  test('genesis is processed first even when a later credential shares its timestamp', () => {
    // Genesis carries no parent link and is issued in the same millisecond as the first membership
    // credential, so without an explicit rule the id tiebreak decides the order.
    const issued = '2026-01-01T00:00:00.000Z';
    const genesis = credential(issued, [], 'dxos.halo.credentials.SpaceGenesis');
    const members = Array.from({ length: 8 }, () => credential(issued));

    const ordered = orderCredentials(entries([...members, genesis]));
    expect(ordered[0].id).to.equal(keyOf(genesis));
  });

  test('an empty document orders to nothing', () => {
    expect(orderCredentials(entries([]))).to.deep.equal([]);
  });

  test('recognizes its own type only', () => {
    expect(isCredentialsDocument(document([]))).to.be.true;
    expect(isCredentialsDocument({ type: 'dxn:org.dxos.document.spaceRoot:0.1.0' })).to.be.false;
    expect(isCredentialsDocument(null)).to.be.false;
  });
});

const credentialCodec = schema.getCodecForType('dxos.halo.credentials.Credential');

const credential = (
  issuanceDate: string,
  parentCredentialIds: PublicKey[] = [],
  type = 'dxos.halo.credentials.SpaceMember',
): Credential => ({
  id: PublicKey.random(),
  issuer: PublicKey.random(),
  issuanceDate: new Date(issuanceDate),
  parentCredentialIds,
  subject: {
    id: PublicKey.random(),
    assertion: { '@type': type },
  },
});

const keyOf = (credential: Credential) => credential.id!.toHex();

const document = (credentials: Credential[]): CredentialsDocument => ({
  type: CREDENTIALS_DOCUMENT_TYPE,
  spaceId: SpaceId.random(),
  credentials: Object.fromEntries(
    credentials.map((credential) => [keyOf(credential), credentialCodec.encode(credential)]),
  ),
});

/** `orderCredentials` takes the entries a history read produces, not the document. */
const entries = (credentials: Credential[]): Map<string, Uint8Array> =>
  new Map(Object.entries(document(credentials).credentials));
