//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { KeyringPair } from '@polkadot/keyring/types';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { IAuctionsClient, AuctionsClient, createApiPromise, createKeyring } from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

describe('Auctions Client', () => {
  let auctionsApi: IAuctionsClient;
  let apiPromise: ApiPromise;
  let sudoer: KeyringPair;
  let alice: KeyringPair;
  let bob: KeyringPair;

  beforeEach(async () => {
    const keyring = await createKeyring();
    const config = { uri: '//Alice' };
    const keypair = keyring.addFromUri(config.uri);
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);
    sudoer = alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');
    auctionsApi = new AuctionsClient(apiPromise, keypair);
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  describe('Auction', () => {
    it('Creates an auction', async () => {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
    });

    it('Does not allow to create already created auction', async () => {
      const auctionName = Math.random().toString(36).substring(2);
      const expectedError = apiPromise.errors.registry.AuctionAlreadyCreated.meta.name.toString();

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.rejectedWith(expectedError);
    });
  });

  describe('Auction Bid', () => {
    it('Allows to bid on name', async () => {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(auctionsApi.bidAuction(auctionName, 1000001)).to.be.fulfilled;
    });

    it('Does not allow to bid on non-existing name', async () => {
      const auctionName = Math.random().toString(36).substring(2);
      const expectedError = apiPromise.errors.registry.AuctionNotFound.meta.name.toString();

      await expect(auctionsApi.bidAuction(auctionName, 1000000)).to.be.rejectedWith(expectedError);
    });

    it('Does not allow to bid too small value', async () => {
      const auctionName = Math.random().toString(36).substring(2);
      const expectedError = apiPromise.errors.registry.BidTooSmall.meta.name.toString();

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(auctionsApi.bidAuction(auctionName, 1000001)).to.be.fulfilled;

      await expect(auctionsApi.bidAuction(auctionName, 1000000)).to.be.rejectedWith(expectedError);
    });
  });

  describe('Auction closing and claiming', () => {
    it('Cannot close or claim an unfinished auction', async () => {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;

      await expect(auctionsApi.closeAuction(auctionName)).to.be.eventually.rejected;
      await expect(auctionsApi.claimAuction(auctionName)).to.be.eventually.rejected;
    });

    it('Can claim an auction (after force-closing it)', async () => {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;

      await auctionsApi.forceCloseAuction(auctionName, sudoer);

      await expect(auctionsApi.claimAuction(auctionName)).to.be.eventually.fulfilled;
    });

    it('Only the winner can claim an auction', async () => {
      const winner = new AuctionsClient(apiPromise, bob);
      const loser = new AuctionsClient(apiPromise, alice);
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(loser.bidAuction(auctionName, 100001)).to.be.fulfilled;
      await expect(winner.bidAuction(auctionName, 100002)).to.be.fulfilled;

      await auctionsApi.forceCloseAuction(auctionName, sudoer);

      await expect(loser.claimAuction(auctionName)).to.be.eventually.rejected;
      await expect(winner.claimAuction(auctionName)).to.be.eventually.fulfilled;
    });

    it('Auction winnner has a domain registered', async () => {
      const winner = new AuctionsClient(apiPromise, bob);
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(winner.bidAuction(auctionName, 100002)).to.be.fulfilled;

      await auctionsApi.forceCloseAuction(auctionName, sudoer);

      const domainKey = await winner.claimAuction(auctionName);

      const accountId = (await apiPromise.query.registry.domains(domainKey.value)).unwrapOr(undefined)?.owners?.[0];
      expect(accountId).not.to.be.undefined;
      expect(accountId?.toString()).to.be.equal(bob.address);
    });
  });
});
