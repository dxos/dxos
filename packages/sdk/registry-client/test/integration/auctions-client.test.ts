//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { KeyringPair } from '@polkadot/keyring/types';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { AccountsClient, AccountKey, AuctionsClient, PolkadotAuctions } from '../../src/index.js';
import { setupRegistryClient } from './utils.js';

chai.use(chaiAsPromised);

describe('Auctions Client', function () {
  let auctionsApi: AuctionsClient;
  let apiPromise: ApiPromise;
  let sudoer: KeyringPair;
  let alice: KeyringPair;
  let bob: KeyringPair;
  let account: AccountKey;
  let accountApi: AccountsClient;

  before(async function () {
    const setupResult = await setupRegistryClient();
    apiPromise = setupResult.apiPromise;
    auctionsApi = setupResult.auctionsClient;
    accountApi = setupResult.accountsClient;
    alice = setupResult.alice;
    bob = setupResult.bob;
    sudoer = setupResult.alice;
    account = await accountApi.createAccount();
  });

  after(async function () {
    await apiPromise.disconnect();
  });

  describe('Auction', function () {
    it('Creates an auction', async function () {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
    });

    it('Does not allow to create already created auction', async function () {
      const auctionName = Math.random().toString(36).substring(2);
      const expectedError = apiPromise.errors.registry.AuctionAlreadyCreated.meta.name.toString();

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.rejectedWith(expectedError);
    });
  });

  describe('Auction Bid', function () {
    it('Allows to bid on name', async function () {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(auctionsApi.bidAuction(auctionName, 1000001)).to.be.fulfilled;
    });

    it('Does not allow to bid on non-existing name', async function () {
      const auctionName = Math.random().toString(36).substring(2);
      const expectedError = apiPromise.errors.registry.AuctionNotFound.meta.name.toString();

      await expect(auctionsApi.bidAuction(auctionName, 1000000)).to.be.rejectedWith(expectedError);
    });

    it('Does not allow to bid too small value', async function () {
      const auctionName = Math.random().toString(36).substring(2);
      const expectedError = apiPromise.errors.registry.BidTooSmall.meta.name.toString();

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(auctionsApi.bidAuction(auctionName, 1000001)).to.be.fulfilled;

      await expect(auctionsApi.bidAuction(auctionName, 1000000)).to.be.rejectedWith(expectedError);
    });
  });

  describe('Auction closing and claiming', function () {
    it('Cannot close or claim an unfinished auction', async function () {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;

      await expect(auctionsApi.closeAuction(auctionName)).to.be.eventually.rejected;
      await expect(auctionsApi.claimAuction(auctionName, account)).to.be.eventually.rejected;
    });

    it('Can claim an auction (after force-closing it)', async function () {
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;

      await auctionsApi.forceCloseAuction(auctionName, sudoer);

      await expect(auctionsApi.claimAuction(auctionName, account)).to.be.eventually.fulfilled;
    });

    it('Only the winner can claim an auction', async function () {
      const winner = new AuctionsClient(new PolkadotAuctions(apiPromise, bob));
      const loser = new AuctionsClient(new PolkadotAuctions(apiPromise, alice));
      await accountApi.addDevice(account, bob.address);
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(loser.bidAuction(auctionName, 100001)).to.be.fulfilled;
      await expect(winner.bidAuction(auctionName, 100002)).to.be.fulfilled;

      await auctionsApi.forceCloseAuction(auctionName, sudoer);

      await expect(loser.claimAuction(auctionName, account)).to.be.eventually.rejected;
      await expect(winner.claimAuction(auctionName, account)).to.be.eventually.fulfilled;
    });

    it('Auction winner has a domain registered', async function () {
      const winner = new AuctionsClient(new PolkadotAuctions(apiPromise, bob));
      await accountApi.addDevice(account, bob.address);
      const auctionName = Math.random().toString(36).substring(2);

      await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
      await expect(winner.bidAuction(auctionName, 100002)).to.be.fulfilled;

      await auctionsApi.forceCloseAuction(auctionName, sudoer);
      const domainKey = await winner.claimAuction(auctionName, account);
      const nativeAccountKey = (await apiPromise.query.registry.domains(domainKey.value)).unwrapOr(undefined)?.owner;

      expect(nativeAccountKey).not.to.be.undefined;
      const accountKey = new AccountKey(nativeAccountKey!);
      expect(accountKey?.toHex()).to.be.equal(account.toHex());
    });
  });
});
