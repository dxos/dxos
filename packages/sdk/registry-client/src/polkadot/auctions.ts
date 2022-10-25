//
// Copyright 2021 DXOS.org
//

import { AddressOrPair } from '@polkadot/api/types';

import { DomainKey, AccountKey, AuctionsClientBackend, Auction } from '../api';
import { SignTxFunction } from './api-transaction-handler';
import { Auction as BaseAuction } from './interfaces';
import { PolkadotClient } from './polkadot-client';

/**
 * Polkadot DXNS auctions client backend.
 */
export class PolkadotAuctions extends PolkadotClient implements AuctionsClientBackend {
  async getAuction(name: string): Promise<Auction | undefined> {
    const auction = (await this.api.query.registry.auctions(name)).unwrapOr(undefined);
    if (!auction) {
      return undefined;
    }

    return this._decodeAuction(auction);
  }

  async listAuctions(): Promise<Auction[]> {
    const auctions = await this.api.query.registry.auctions.entries();
    return auctions
      .map((auction) => auction[1])
      .map((details) => details.unwrap())
      .map(this._decodeAuction);
  }

  async createAuction(name: string, startAmount: number): Promise<void> {
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.createAuction(name, startAmount));
  }

  async bidAuction(name: string, amount: number): Promise<void> {
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.bidAuction(name, amount));
  }

  async closeAuction(name: string): Promise<void> {
    await this.transactionsHandler.sendTransaction(this.api.tx.registry.closeAuction(name));
  }

  async forceCloseAuction(name: string, sudoSignFn: SignTxFunction | AddressOrPair): Promise<void> {
    await this.transactionsHandler.sendSudoTransaction(this.api.tx.registry.forceCloseAuction(name), sudoSignFn);
  }

  async claimAuction(domainName: string, account: AccountKey): Promise<DomainKey> {
    const domainKey = DomainKey.random();
    await this.transactionsHandler.sendTransaction(
      this.api.tx.registry.claimAuction(domainKey.value, domainName, account.value)
    );
    return domainKey;
  }

  private _decodeAuction(auction: BaseAuction): Auction {
    return {
      name: auction.name.toUtf8(),
      highestBid: {
        bidder: auction.highest_bidder.toString(),
        amount: auction.highest_bid.toBn()
      },
      endBlock: auction.end_block.toBn(),
      closed: auction.closed.isTrue
    };
  }
}
