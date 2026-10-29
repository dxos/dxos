//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Entity } from '../client/types.ts';
import { odynca, unplaced } from '../testing/geo-areas-fixture.ts';
import { decodeEntities, isResult, isThin, kindOf, toCard } from './results.ts';

const listing: Entity = {
  id: 'https://www.otodom.pl/oferta/123',
  types: ['lh:ApartmentListing'],
  props: {
    'schema:name': ['Sunny 2 rooms &amp; balcony'],
    'lh:monthlyPrice': [3200],
    'lh:adminFee': [600],
    'lh:areaM2': [48.5],
    'schema:numberOfRooms': [2],
    'lh:district': ['Mokotów'],
    'lh:amenity': ['balcony', 'lift', 'parking', 'dishwasher', 'storage', 'garden', 'gym'],
    'schema:image': ['https://img.example/1.jpg', 'not-a-url', 'https://img.example/2.jpg'],
  },
};

describe('toCard', () => {
  test('a listing: decoded title, rent with fees, facts as rows, images and the kind', ({ expect }) => {
    const card = toCard(listing);
    expect(card.title).toBe('Sunny 2 rooms & balcony');
    expect(card.price).toBe('3,800 z\u0142 / mo');
    expect(card.priceNote).toBe('rent 3,200 + fees 600');
    expect(card.site).toBe('otodom.pl');
    expect(card.url).toBe(listing.id);
    expect(card.images).toEqual(['https://img.example/1.jpg', 'https://img.example/2.jpg']);
    expect(card.rows.map((row) => row.text)).toEqual([
      '48.5 m²',
      '2 rooms',
      'Mokotów',
      'balcony, lift, parking, dishwasher, storage, garden',
    ]);
    expect(card.tags).toEqual([{ label: 'Apartment Listing' }]);
  });

  test('a product: price with currency; a rating when there is no price', ({ expect }) => {
    const product: Entity = {
      id: 'urn:x:1',
      types: ['schema:Product'],
      props: { 'schema:name': ['Mug'], 'schema:price': ['12.5'], 'schema:priceCurrency': ['EUR'] },
    };
    expect(toCard(product).price).toBe('12.5 EUR');
    const place: Entity = {
      id: 'urn:x:2',
      types: ['schema:Restaurant'],
      props: { 'schema:name': ['Nam'], 'lh:ratingValue': [4.56] },
    };
    expect(toCard(place).price).toBe('4.6 \u2605');
    expect(toCard(place).url).toBeUndefined();
  });

  test('legal material: the journal reference above the title, force as a tag', ({ expect }) => {
    const act: Entity = {
      id: 'https://api.sejm.gov.pl/eli/acts/DU/2001/733',
      types: ['schema:Legislation'],
      props: {
        'schema:name': ['Ustawa o ochronie praw lokatorów'],
        'schema:legislationIdentifier': ['Dz.U. 2001 nr 71 poz. 733'],
        'schema:legislationLegalForce': ['schema:InForce'],
      },
    };
    const card = toCard(act);
    expect(card.eyebrow).toBe('Dz.U. 2001 nr 71 poz. 733');
    expect(card.tags).toContainEqual({ label: 'in force', hue: 'emerald' });
  });
});

describe('results', () => {
  test('scaffolding, bare pages, extension nodes and unnamed subjects are not results', ({ expect }) => {
    expect(isResult(listing)).toBe(true);
    expect(isResult({ ...listing, types: ['lh:SearchResult'] })).toBe(false);
    expect(isResult({ ...listing, types: ['schema:WebPage'] })).toBe(false);
    expect(isResult({ ...listing, id: `${listing.id}#ext-booking` })).toBe(false);
    expect(isResult({ ...listing, props: {} })).toBe(false);
  });

  test('a result with only a name and a link is thin', ({ expect }) => {
    expect(isThin({ id: 'a', types: [], props: { 'schema:name': ['A'], 'schema:url': ['https://a'] } })).toBe(true);
    expect(isThin(listing)).toBe(false);
  });

  test('kindOf skips scaffolding types and splits words', ({ expect }) => {
    expect(kindOf({ id: 'a', types: ['schema:Offer', 'schema:CafeOrCoffeeShop'], props: {} })).toBe(
      'Cafe Or Coffee Shop',
    );
  });

  test('decodeEntities handles named and numeric entities', ({ expect }) => {
    expect(decodeEntities('Tom &amp; Jerry &#038; &#x27;co&#x27;')).toBe("Tom & Jerry & 'co'");
  });
});

describe('card location', () => {
  test('places a card through locationOf, with its address, or says it has none', ({ expect }) => {
    const card = toCard(odynca);
    expect(card.geo).toEqual({
      lat: 52.2005,
      lng: 21.0081,
      precisionM: 250,
      address: 'ul. Ody\u0144ca, Stary Mokotów, Mokotów, Warszawa',
    });
    expect(card.rows.find((row) => row.location)?.text).toBe('Mokotów');
    expect(toCard(unplaced).unlocated).toBe(true);
    expect(toCard(unplaced).geo).toBeUndefined();
  });
});
