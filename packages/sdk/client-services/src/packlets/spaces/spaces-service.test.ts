//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { Space, SpacesService } from '@dxos/protocols/proto/dxos/client/services';
import { afterEach, afterTest, beforeEach, describe, test } from '@dxos/test';

import { ServiceContext } from '../services';
import { createServiceContext } from '../testing';
import { SpacesServiceImpl } from './spaces-service';

chai.use(chaiAsPromised);

describe('SpacesService', () => {
  let serviceContext: ServiceContext;
  let spacesService: SpacesService;

  beforeEach(async () => {
    serviceContext = createServiceContext();
    await serviceContext.open();
    spacesService = new SpacesServiceImpl(
      serviceContext.identityManager,
      serviceContext.spaceManager,
      serviceContext.dataServiceSubscriptions,
      async () => {
        await serviceContext.initialized.wait();
        return serviceContext.dataSpaceManager!;
      },
    );
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  describe('createSpace', () => {
    test('fails if no identity is available', async () => {
      await expect(spacesService.createSpace()).to.be.rejectedWith();
    });

    test('creates a new space', async () => {
      await serviceContext.createIdentity();
      const space = await spacesService.createSpace();
      expect(space).to.exist;
      expect(space.spaceKey).to.be.instanceof(PublicKey);
    });
  });

  describe.skip('updateSpace', () => {});

  describe('querySpaces', () => {
    test('returns empty list if no identity is available', async () => {
      const query = spacesService.querySpaces();
      const result = new Trigger<Space[] | undefined>();
      query.subscribe(({ spaces }) => {
        result.wake(spaces);
      });
      afterTest(() => query.close());
      expect(await result.wait()).to.be.length(0);
    });

    test('returns list of existing spaces', async () => {
      await serviceContext.createIdentity();
      const existingSpaces = [
        await spacesService.createSpace(),
        await spacesService.createSpace(),
        await spacesService.createSpace(),
      ];

      const query = spacesService.querySpaces();
      const result = new Trigger<Space[] | undefined>();
      query.subscribe(({ spaces }) => {
        result.wake(spaces);
      });
      afterTest(() => query.close());

      const spaces = await result.wait();
      expect(spaces).to.be.length(3);
      expect(spaces?.map((s) => s.spaceKey)).to.deep.equal(existingSpaces?.map((s) => s.spaceKey));
    });

    test('updates when new space is added', async () => {
      await serviceContext.createIdentity();
      const query = spacesService.querySpaces();
      let result = new Trigger<Space[] | undefined>();
      query.subscribe(({ spaces }) => {
        result.wake(spaces);
      });
      afterTest(() => query.close());
      expect(await result.wait()).to.be.length(0);

      result = new Trigger<Space[] | undefined>();
      const space = await spacesService.createSpace();
      expect(await result.wait()).to.deep.equal([space]);
    });

    test.skip('updates when space is updated', async () => {});
  });

  describe.skip('writeCrendentials', () => {});
  describe.skip('queryCrendentials', () => {});
});
