//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SpaceId } from '@dxos/keys';

import {
  CREDENTIALS_DOCUMENT_TYPE,
  type CredentialsDocument,
  type CredentialsDocumentEntry,
  isCredentialsDocument,
  orderCredentials,
} from './credentials-document';

const entry = (issuanceDate: string, parents?: string[]): CredentialsDocumentEntry => ({
  data: new Uint8Array([1, 2, 3]),
  issuanceDate,
  parents,
});

const document = (credentials: CredentialsDocument['credentials']): CredentialsDocument => ({
  type: CREDENTIALS_DOCUMENT_TYPE,
  spaceId: SpaceId.random(),
  credentials,
});

describe('credentials document', () => {
  test('orders by issuance date, breaking ties on id', () => {
    const ordered = orderCredentials(
      document({
        c: entry('2026-01-03T00:00:00.000Z'),
        b: entry('2026-01-01T00:00:00.000Z'),
        a: entry('2026-01-01T00:00:00.000Z'),
      }),
    );

    expect(ordered.map(({ id }) => id)).to.deep.equal(['a', 'b', 'c']);
  });

  test('converges regardless of the order entries were appended in', () => {
    const credentials = {
      a: entry('2026-01-01T00:00:00.000Z'),
      b: entry('2026-01-02T00:00:00.000Z', ['a']),
      c: entry('2026-01-03T00:00:00.000Z', ['b']),
    };

    const forwards = orderCredentials(document(credentials));
    const backwards = orderCredentials(
      document(Object.fromEntries(Object.entries(credentials).reverse()) as CredentialsDocument['credentials']),
    );

    expect(forwards.map(({ id }) => id)).to.deep.equal(backwards.map(({ id }) => id));
  });

  test('a parent is processed before its child even when issued later', () => {
    // Clock skew across devices can date a parent after its child; the declared dependency wins.
    const ordered = orderCredentials(
      document({
        child: entry('2026-01-01T00:00:00.000Z', ['parent']),
        parent: entry('2026-01-05T00:00:00.000Z'),
      }),
    );

    expect(ordered.map(({ id }) => id)).to.deep.equal(['parent', 'child']);
  });

  test('a parent that has not replicated yet does not block its child', () => {
    const ordered = orderCredentials(
      document({
        child: entry('2026-01-01T00:00:00.000Z', ['neverReplicated']),
      }),
    );

    expect(ordered.map(({ id }) => id)).to.deep.equal(['child']);
  });

  test('a cycle keeps every credential rather than dropping it', () => {
    const ordered = orderCredentials(
      document({
        a: entry('2026-01-01T00:00:00.000Z', ['b']),
        b: entry('2026-01-02T00:00:00.000Z', ['a']),
      }),
    );

    expect(ordered.map(({ id }) => id).sort()).to.deep.equal(['a', 'b']);
  });

  test('an empty document orders to nothing', () => {
    expect(orderCredentials(document({}))).to.deep.equal([]);
  });

  test('recognizes its own type only', () => {
    expect(isCredentialsDocument(document({}))).to.be.true;
    expect(isCredentialsDocument({ type: 'dxn:org.dxos.document.spaceRoot:0.1.0' })).to.be.false;
    expect(isCredentialsDocument(null)).to.be.false;
  });
});
