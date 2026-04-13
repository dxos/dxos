//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Organization } from '@dxos/types';

/**
 * A point-in-time snapshot of a token's market data.
 */
export const TokenMetric = Schema.Struct({
  /** Token symbol (e.g., "ETH", "SOL"). */
  symbol: Schema.String,
  /** Token name. */
  name: Schema.optional(Schema.String),
  /** CoinGecko token ID. */
  coingeckoId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Current price in USD. */
  price: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Market capitalization in USD. */
  marketCap: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** 24h trading volume in USD. */
  volume24h: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Total value locked (for DeFi). */
  tvl: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** 24h price change percentage. */
  priceChange24h: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** 7d price change percentage. */
  priceChange7d: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Linked organization. */
  organization: Schema.optional(Ref.Ref(Organization.Organization).pipe(FormInputAnnotation.set(false))),
  /** Token image URL. */
  image: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** When this metric was recorded. */
  recordedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.tokenMetric',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['symbol']),
  Annotation.IconAnnotation.set({
    icon: 'ph--coins--regular',
    hue: 'amber',
  }),
);

export interface TokenMetric extends Schema.Schema.Type<typeof TokenMetric> {}

/**
 * CryptoWatchlist for tracking a set of tokens.
 */
export const CryptoWatchlist = Schema.Struct({
  /** Display name. */
  name: Schema.optional(Schema.String),
  /** Comma-separated CoinGecko token IDs to track. */
  tokenIds: Schema.optional(Schema.String),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.cryptoWatchlist',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--coins--regular',
    hue: 'amber',
  }),
);

export interface CryptoWatchlist extends Schema.Schema.Type<typeof CryptoWatchlist> {}

/** Input schema for creating a CryptoWatchlist. */
export const CreateCryptoWatchlistSchema = Schema.Struct({
  tokenIds: Schema.String.annotations({
    title: 'Token IDs',
    description: 'Comma-separated CoinGecko token IDs (e.g., "bitcoin,ethereum,solana").',
  }),
});

export interface CreateCryptoWatchlistSchema extends Schema.Schema.Type<typeof CreateCryptoWatchlistSchema> {}

/** Creates a CryptoWatchlist object. */
export const makeWatchlist = (props: CreateCryptoWatchlistSchema): CryptoWatchlist => {
  return Obj.make(CryptoWatchlist, {
    name: 'Token Watchlist',
    tokenIds: props.tokenIds,
  });
};

/** Creates a TokenMetric object. */
export const makeMetric = (props: Partial<Obj.MakeProps<typeof TokenMetric>> & { symbol: string; coingeckoId: string }): TokenMetric => {
  return Obj.make(TokenMetric, props);
};
