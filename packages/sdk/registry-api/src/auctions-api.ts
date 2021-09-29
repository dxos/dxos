//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { AddressOrPair } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';
import BigNumber from 'bn.js';

import { ApiTransactionHandler } from './api-transaction-handler';
import { DomainKey } from './models';

/**
 * Auction allows assigning names to identities. It facilitates domain names registration and ownership.
 */
export interface Auction {
  /**
   * `Name` which is an object and purpose of the auction.
   */
  name: string,
  /**
   * Identity that has made the highest (currently winning) offer.
   */
  highestBidder: string,
  /**
   * The amount offered that is currently winning the auction.
   */
  highestBid: BigNumber,
  /**
   * The number of the blockchain block mined that acts as last update timestamp.
   */
  endBlock: BigNumber,
  /**
   * If true - auction is closed and the name is owned by the highest bidder. If false - it is an ongoing auction.
   */
  closed: boolean
}

/**
 * Auctions operations supported in the DXOS.
 */
export interface IAuctionsApi {
  /**
   * Creates a new auction.
   * @param name An object of the auction.
   * @param startAmount The initial amount offered.
   */
  createAuction(name: string, startAmount: number): Promise<void>;

  /**
   * Offers a new amount in the auction.
   * @param name An object of the auction.
   * @param amount The offered amount.
   */
  bidAuction(name: string, amount: number): Promise<void>;

  /**
   * Closes an auction. Note! This DOES NOT transfer the ownership to the highest bidder. They need to claim
   * by invoking separate operation.
   * @param name An object of the auction.
   */
  closeAuction(name: string): Promise<void>;

  /**
   * Forces close an auction. This arbitrarily closes the ongoing auction even its time is not reached yet.
   * Note! This is reserved to sudo/admin accounts.
   * @param name An object of the auction.
   * @param sudoer A sudo/admin account needed to execute this high-privilege operation.
   */
  forceCloseAuction(name: string, sudoer: KeyringPair): Promise<void>;

  /**
   * Allows for transferring the ownership of the name to the highest bidder.
   * @param name An object of the auction.
   */
  claimAuction(name: string): Promise<DomainKey>;

  /**
   * Returns a collection of all auctions (ongoing and closed) in DXOS.
   */
  listAuctions(): Promise<Auction[]>;
}

export class AuctionsApi implements IAuctionsApi {
  private transactionsHandler: ApiTransactionHandler;

  constructor (private api: ApiPromise, private signer?: AddressOrPair) {
    this.transactionsHandler = new ApiTransactionHandler(api, signer);
  }

  async createAuction (name: string, startAmount: number): Promise<void> {
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.createAuction(name, startAmount));
  }

  async bidAuction (name: string, amount: number): Promise<void> {
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.bidAuction(name, amount));
  }

  async closeAuction (name: string): Promise<void> {
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.closeAuction(name));
  }

  async forceCloseAuction (name: string, sudoer: KeyringPair): Promise<void> {
    await this.transactionsHandler.sendSudoTransaction(this.api.tx.registry.forceCloseAuction(name), sudoer);
  }

  async claimAuction (domainName: string): Promise<DomainKey> {
    const domainKey = DomainKey.random();
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.claimAuction(domainKey.value, domainName));
    return domainKey;
  }

  async listAuctions (): Promise<Auction[]> {
    const auctions = await this.api.query.registry.auctions.entries();
    return auctions
      .map(auction => auction[1])
      .map(details => details.unwrap())
      .map(auction => ({
        name: auction.name.toUtf8(),
        highestBid: auction.highest_bid.toBn(),
        highestBidder: auction.highest_bidder.toString(),
        endBlock: auction.end_block.toBn(),
        closed: auction.closed.isTrue
      }));
  }
}
