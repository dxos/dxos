//
// Copyright 2026 DXOS.org
//

// A few Warsaw rentals in the shape lighthouse's otodom and olx extractors write (flat schema:latitude/longitude with
// lh:locationPrecisionM, district and street), the drawn areas of the "Warsaw apartments" session, and a price model:
// enough for the model panel's area rows, the location popover and the card notes.

import { type Entity } from '../client/types.ts';
import { type AreaOverride, type RatingModel } from '../model/rating.ts';

const listing = (id: string, name: string, price: number, place: Record<string, Array<string | number>>): Entity => ({
  id: `https://www.otodom.pl/pl/oferta/${id}`,
  types: ['lh:RentalListing'],
  props: {
    'schema:name': [name],
    'lh:monthlyPrice': [price],
    'lh:areaM2': [48],
    'schema:numberOfRooms': [2],
    'schema:addressLocality': ['Warszawa'],
    ...place,
  },
});

/** Pinned to the building, inside "Around Mokotów". */
export const pulawska = listing('pulawska-2-pokoje', '2 pokoje, Puławska, blisko metra', 3900, {
  'lh:district': ['Mokotów'],
  'lh:statedStreet': ['ul. Puławska 101'],
  'schema:latitude': [52.1906],
  'schema:longitude': [21.0129],
  'lh:locationPrecisionM': [15],
});

/** Placed to the street only: a precision ring on the map. */
export const odynca = listing('odynca-balkon', 'Mieszkanie z balkonem, Odyńca', 4200, {
  'lh:district': ['Mokotów'],
  'lh:neighbourhood': ['Stary Mokotów'],
  'lh:statedStreet': ['ul. Odyńca'],
  'schema:latitude': [52.2005],
  'schema:longitude': [21.0081],
  'lh:locationPrecisionM': [250],
});

/** Far outside the areas (Bemowo). */
export const bemowo = listing('bemowo-nowe', 'Nowe 2 pokoje, Bemowo', 3500, {
  'lh:district': ['Bemowo'],
  'lh:statedStreet': ['ul. Powstańców Śląskich'],
  'schema:latitude': [52.2408],
  'schema:longitude': [20.9115],
  'lh:locationPrecisionM': [40],
});

/** Names a district but has no point: "no location". */
export const unplaced = listing('wola-bez-mapy', '2 pokoje, Wola', 3700, { 'lh:district': ['Wola'] });

export const geoEntities: Entity[] = [pulawska, odynca, bemowo, unplaced];

export const aroundMokotow: AreaOverride = {
  id: 'area-around-mokotow',
  label: 'Around Mokotów',
  shape: { type: 'Circle', center: [21.0129, 52.1906], radiusM: 900 },
  mode: 'prefer',
  softM: 400,
};

export const staryMokotow: AreaOverride = {
  id: 'area-stary-mokotow',
  label: 'Mokotów',
  shape: {
    type: 'Polygon',
    coordinates: [
      [
        [21.0, 52.195],
        [21.025, 52.195],
        [21.025, 52.21],
        [21.0, 52.21],
        [21.0, 52.195],
      ],
    ],
  },
  mode: 'prefer',
  softM: 0,
};

export const geoAreas: AreaOverride[] = [aroundMokotow, staryMokotow];

export const geoModel: RatingModel = {
  version: 2,
  rationale: 'Cheaper is better; two rooms near the metro.',
  terms: [
    { id: 'price', label: 'Monthly price', weight: 2, value: { prop: 'lh:monthlyPrice' }, shape: 'lower' },
    { id: 'area', label: 'Floor area', weight: 1, value: { prop: 'lh:areaM2' }, shape: 'higher' },
  ],
};
