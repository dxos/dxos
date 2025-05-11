//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

// Based on https://schema.org/PostalAddress
export const PostalAddress = S.Struct({
  street: S.optional(
    S.String.annotations({
      description: 'The street address.',
      examples: ['1600 Amphitheatre Pkwy'],
    }),
  ),
  extended: S.optional(
    S.String.annotations({
      description: 'An address extension such as an apartment number, C/O or alternative name.',
      examples: ['Apt 1', 'Suite 2'],
    }),
  ),
  locality: S.optional(
    S.String.annotations({
      description: 'The locality in which the street address is, and which is in the region.',
      examples: ['Mountain View', 'Bangkok'],
    }),
  ),
  region: S.optional(
    S.String.annotations({
      description: 'The region in which the locality is, and which is in the country.',
      examples: ['CA', 'NY'],
    }),
  ),
  postalCode: S.optional(
    S.String.annotations({
      description: 'The postal code.',
      examples: ['12345', 'A1A 1A1'],
    }),
  ),
  postOfficeBoxNumber: S.optional(
    S.String.annotations({
      description: 'The post office box number for PO Box addresses.',
    }),
  ),
  country: S.optional(
    S.String.annotations({
      description: 'The country in 2-letter ISO 3166-1 alpha-2 format.',
      examples: ['US', 'SG'],
    }),
  ),
  // TODO(burdon): Unknown error (handling tuples?)
  // location: S.optional(Format.GeoPoint),
  // location: S.Tuple(S.Number, S.Number),
});
