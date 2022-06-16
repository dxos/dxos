//
// Copyright 2022 DXOS.org
//

import { AddressOrPair } from '@polkadot/api/types';
import BigNumber from 'bn.js';

import { SignTxFunction } from '../polkadot';
import { AccountKey } from './account-key';
import { DomainKey } from './domain-key';

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
    bidder: string,
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
 * Auctions operations supported in the DXOS.
 */
export interface AuctionsClientBackend {
  /**
   * Get an auction by name.
   */
  getAuction(name: string): Promise<Auction | undefined>

  /**
   * Returns a collection of all auctions (ongoing and closed) in DXOS.
   */
  listAuctions(): Promise<Auction[]>

  /**
   * Creates a new auction.
   * @param name An object of the auction.
   * @param startAmount The initial amount offered.
   */
  createAuction(name: string, startAmount: number): Promise<void>

  /**
   * Offers a new amount in the auction.
   * @param name An object of the auction.
   * @param amount The offered amount.
   */
  bidAuction(name: string, amount: number): Promise<void>

  /**
   * Closes an auction. Note! This DOES NOT transfer the ownership to the highest bidder. They need to claim
   * by invoking separate operation.
   * @param name An object of the auction.
   */
  closeAuction(name: string): Promise<void>

  /**
   * Forces close an auction. This arbitrarily closes the ongoing auction even its time is not reached yet.
   * Note! This is reserved to sudo/admin accounts.
   * @param name An object of the auction.
   * @param sudoSignFn A transaction signing function using a sudo/admin account with rights to to execute this high-privilege operation.
   */
  // TODO(wittjosiah): Generisize the signature function to not be tied to the Polkadot API.
  forceCloseAuction(name: string, sudoSignFn: SignTxFunction | AddressOrPair): Promise<void>

  /**
   * Allows for transferring the ownership of the name to the highest bidder.
   * @param name An object of the auction.
   * @param account The DXNS Account that will claim the ownership of the domain.
   */
  claimAuction(name: string, account: AccountKey): Promise<DomainKey>
}
