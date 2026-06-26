//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Organization, Person } from '@dxos/types';

import { findReferences, insertReferences } from './quotes';

describe('insertReferences', () => {
  test('should replace quotes with DXN references', () => {
    const quotes = {
      references: [{ quote: 'computational irreducibility', id: '01JTG9JW11XGWJZ32AW8ET93D1' }],
    };

    expect(insertReferences('This is a computational irreducibility test.', quotes)).toBe(
      'This is a [computational irreducibility](echo:/01JTG9JW11XGWJZ32AW8ET93D1) test.',
    );
    expect(
      insertReferences(
        "And what I'd like to talk today about is Steven Wolfram's concept of a computational irreducibility.",
        quotes,
      ),
    ).toBe(
      "And what I'd like to talk today about is Steven Wolfram's concept of a [computational irreducibility](echo:/01JTG9JW11XGWJZ32AW8ET93D1).",
    );
  });

  test('does not nest links when one quote is a substring of another', () => {
    const quotes = {
      references: [
        { quote: 'Sarah', id: '01JTG9JW11XGWJZ32AW8ET93D1' },
        { quote: 'Sarah Johnson', id: '01JTG9JW11XGWJZ32AW8ET93D1' },
      ],
    };

    // "Sarah Johnson" is linked as a whole (processed first); the standalone "Sarah" is linked
    // separately; the "Sarah" inside the first link is left untouched (no nested `[[..](..)](..)`).
    expect(insertReferences('Sarah Johnson spoke. Later Sarah left.', quotes)).toBe(
      '[Sarah Johnson](echo:/01JTG9JW11XGWJZ32AW8ET93D1) spoke. Later [Sarah](echo:/01JTG9JW11XGWJZ32AW8ET93D1) left.',
    );
  });

  test('does not re-link a repeated quote inside an already-inserted link', () => {
    const quotes = { references: [{ quote: 'Amco', id: '01JTG9JW11XGWJZ32AW8ET93D1' }] };

    expect(insertReferences('Amco and Amco again.', quotes)).toBe(
      '[Amco](echo:/01JTG9JW11XGWJZ32AW8ET93D1) and [Amco](echo:/01JTG9JW11XGWJZ32AW8ET93D1) again.',
    );
  });
});

describe('findReferences', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('links nouns to objects via full-text search, including first-name tokens', async () => {
    const { db } = await builder.createDatabase({ types: [Organization.Organization, Person.Person] });
    const amco = db.add(Obj.make(Organization.Organization, { name: 'Amco' }));
    const sarah = db.add(Obj.make(Person.Person, { fullName: 'Sarah Johnson' }));
    await db.flush({ indexes: true });

    const { references } = await findReferences(['Amco', 'Sarah', 'Nonexistent'], db);
    const byQuote = new Map(references.map((reference) => [reference.quote, reference.id]));

    expect(byQuote.get('Amco')).toEqual(amco.id);
    // Full-text matches a single token within a multi-word field, so first-name mentions link to
    // the full-name object — this is also what makes the overlap case in `insertReferences` real.
    expect(byQuote.get('Sarah')).toEqual(sarah.id);
    expect(byQuote.has('Nonexistent')).toBe(false);
  });

  test('deduplicates and trims nouns before lookup', async () => {
    const { db } = await builder.createDatabase({ types: [Organization.Organization] });
    db.add(Obj.make(Organization.Organization, { name: 'Amco' }));
    await db.flush({ indexes: true });

    const { references } = await findReferences(['Amco', 'Amco', '  Amco  ', ''], db);

    expect(references.filter((reference) => reference.quote === 'Amco')).toHaveLength(1);
  });
});
