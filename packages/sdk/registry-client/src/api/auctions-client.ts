//
// Copyright 2021 DXOS.org
//

import { AddressOrPair } from '@polkadot/api/types';

import { SignTxFunction } from '../polkadot';
import { AccountKey } from './account-key';
import { Auction, AuctionsClientBackend } from './auctions';
import { DomainKey } from './domain-key';

/**
 * Main API for DXNS auctions management.
 */
export class AuctionsClient {
  constructor(private readonly _backend: AuctionsClientBackend) {}

  /**
   * Get an auction by name.
   */
  async getAuction(name: string): Promise<Auction | undefined> {
    return this._backend.getAuction(name);
  }

  /**
   * Returns a collection of all auctions (ongoing and closed) in DXOS.
   */
  async listAuctions(): Promise<Auction[]> {
    return this._backend.listAuctions();
  }

  /**
   * Creates a new auction.
   * @param name An object of the auction.
   * @param startAmount The initial amount offered.
   */
  async createAuction(name: string, startAmount: number): Promise<void> {
    return this._backend.createAuction(name, startAmount);
  }

  /**
   * Offers a new amount in the auction.
   * @param name An object of the auction.
   * @param amount The offered amount.
   */
  async bidAuction(name: string, amount: number): Promise<void> {
    return this._backend.bidAuction(name, amount);
  }

  /**
   * Closes an auction. Note! This DOES NOT transfer the ownership to the highest bidder. They need to claim
   * by invoking separate operation.
   * @param name An object of the auction.
   */
  async closeAuction(name: string): Promise<void> {
    await this._backend.closeAuction(name);
  }

  /**
   * Forces close an auction. This arbitrarily closes the ongoing auction even its time is not reached yet.
   * Note! This is reserved to sudo/admin accounts.
   * @param name An object of the auction.
   * @param sudoSignFn A transaction signing function using a sudo/admin account with rights to to execute this high-privilege operation.
   */
  async forceCloseAuction(
    name: string,
    sudoSignFn: SignTxFunction | AddressOrPair
  ): Promise<void> {
    await this._backend.forceCloseAuction(name, sudoSignFn);
  }

  /**
   * Allows for transferring the ownership of the name to the highest bidder.
   * @param name An object of the auction.
   * @param account The DXNS Account that will claim the ownership of the domain.
   */
  async claimAuction(
    domainName: string,
    account: AccountKey
  ): Promise<DomainKey> {
    return this._backend.claimAuction(domainName, account);
  }
}
