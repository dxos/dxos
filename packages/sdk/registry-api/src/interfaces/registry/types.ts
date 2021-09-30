// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Bytes, Option, Struct, Text, U8aFixed, Vec, bool, u128 } from '@polkadot/types';
import type { AccountId, BlockNumber } from '@polkadot/types/interfaces/runtime';

/** @name Auction */
export interface Auction extends Struct {
  readonly name: Bytes;
  readonly highest_bidder: AccountId;
  readonly highest_bid: u128;
  readonly end_block: BlockNumber;
  readonly closed: bool;
}

/** @name Domain */
export interface Domain extends Struct {
  readonly name: Option<Text>;
  readonly owners: Vec<AccountId>;
}

/** @name DomainKey */
export interface DomainKey extends U8aFixed {}

/** @name Multihash */
export interface Multihash extends U8aFixed {}

/** @name Record */
export interface Record extends Struct {
  readonly data: Bytes;
}

export type PHANTOM_REGISTRY = 'registry';
