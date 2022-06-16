//
// Copyright 2021 DXOS.org
//

import { AddressOrPair } from '@polkadot/api/types';

import { SignTxFunction } from '../polkadot';
import { AccountKey } from './account-key';
import { Auction, AuctionsClientBackend } from './auctions';
import { DomainKey } from './domain-key';

/**
 *
 */
export class AuctionsClient {
  constructor (
    private readonly _backend: AuctionsClientBackend
  ) {}

  async getAuction (name: string): Promise<Auction | undefined> {
    return this._backend.getAuction(name);
  }

  async listAuctions (): Promise<Auction[]> {
    return this._backend.listAuctions();
  }

  async createAuction (name: string, startAmount: number): Promise<void> {
    return this._backend.createAuction(name, startAmount);
  }

  async bidAuction (name: string, amount: number): Promise<void> {
    return this._backend.bidAuction(name, amount);
  }

  async closeAuction (name: string): Promise<void> {
    await this._backend.closeAuction(name);
  }

  async forceCloseAuction (name: string, sudoSignFn: SignTxFunction | AddressOrPair): Promise<void> {
    await this._backend.forceCloseAuction(name, sudoSignFn);
  }

  async claimAuction (domainName: string, account: AccountKey): Promise<DomainKey> {
    return this._backend.claimAuction(domainName, account);
  }
}
