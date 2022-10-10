//
// Copyright 2022 DXOS.org
//

import { AddressOrPair } from '@polkadot/api/types';
import BigNumber from 'bn.js';

import { SignTxFunction } from '../polkadot/index.js';
import { AccountKey } from './account-key.js';
import { DomainKey } from './domain-key.js';

/**
 * Auction allows assigning names to identities.
 * It facilitates domain names registration and ownership.
 */
export interface Auction {
  /**
   * `Name` which is an object and purpose of the auction.
   */
  name: string

  /**
   * The highest offer currently winning the auction.
   */
  highestBid: {
    bidder: string
    amount: BigNumber
  }

  /**
   * The number of the blockchain block mined that acts as last update timestamp.
   */
  endBlock: BigNumber

  /**
   * If true - auction is closed and the name is owned by the highest bidder.
   * If false - it is an ongoing auction.
   */
  closed: boolean
}

/**
 * Auctions operations supported by DXNS.
 */
export interface AuctionsClientBackend {
  getAuction(name: string): Promise<Auction | undefined>
  listAuctions(): Promise<Auction[]>
  createAuction(name: string, startAmount: number): Promise<void>
  bidAuction(name: string, amount: number): Promise<void>
  closeAuction(name: string): Promise<void>
  // TODO(wittjosiah): Generisize the signature function to not be tied to the Polkadot API.
  forceCloseAuction(name: string, sudoSignFn: SignTxFunction | AddressOrPair): Promise<void>
  claimAuction(name: string, account: AccountKey): Promise<DomainKey>
}
