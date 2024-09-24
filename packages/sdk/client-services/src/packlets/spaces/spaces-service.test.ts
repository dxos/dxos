//
// Copyright 2023 DXOS.org
//

import { afterEach, onTestFinished, beforeEach, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { type Space, type SpacesService } from '@dxos/protocols/proto/dxos/client/services';

import { SpacesServiceImpl } from './spaces-service';
import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';

describe('SpacesService', () => {
  let serviceContext: ServiceContext;
  let spacesService: SpacesService;

  beforeEach(async () => {
    serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    spacesService = new SpacesServiceImpl(serviceContext.identityManager, serviceContext.spaceManager, async () => {
      await serviceContext.initialized.wait();
      return serviceContext.dataSpaceManager!;
    });
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  describe('createSpace', () => {
    test('fails if no identity is available', async () => {
      await expect(spacesService.createSpace()).rejects.toBeInstanceOf(Error);
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
      onTestFinished(() => query.close());
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
      onTestFinished(() => query.close());

      const spaces = await result.wait();
      expect(spaces).to.be.length(3);
      expect(spaces?.map((s) => s.spaceKey)).to.deep.equal(existingSpaces?.map((s) => s.spaceKey));
    });

    test('updates when new space is added', async () => {
      await serviceContext.createIdentity();
      const query = spacesService.querySpaces();
      const result = new Trigger<Space[] | undefined>();
      query.subscribe(({ spaces }) => {
        result.wake(spaces);
      });
      onTestFinished(() => query.close());
      expect(await result.wait()).to.be.length(0);

      result.reset();
      const space = await spacesService.createSpace();
      const spaces = await result.wait();
      expect(spaces).to.be.length(1);
      expect(spaces?.[0].spaceKey.equals(space.spaceKey)).to.be.true;
    });

    test.skip('updates when space is updated', async () => {});
  });

  describe.skip('writeCrendentials', () => {});
  describe.skip('queryCrendentials', () => {});
});
