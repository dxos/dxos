//
// Copyright 2020 DXOS.org
//

import { withKnobs, number } from '@storybook/addon-knobs';
import debug from 'debug';
import leveljs from 'level-js';
import ram from 'random-access-memory';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { blueGrey } from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/core/styles';

import { Keyring, KeyType, KeyStore } from '@dxos/credentials';
import { createId } from '@dxos/crypto';
import {
  codec, Database, PartyManager, PartyFactory, FeedStoreAdapter, IdentityManager
} from '@dxos/experimental-echo-db';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { FeedStore } from '@dxos/feed-store';
import { FullScreen, Grid, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { createStorage } from '@dxos/random-access-multi-storage';

export const createDatabase = async ({ storage = ram, keyStorage = undefined, swarmProvider = new SwarmProvider() } = {}) => {
  const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);

  const keystore = new KeyStore(keyStorage);
  const keyring = new Keyring(keystore);
  await keyring.load();
  const identityManager = new IdentityManager(keyring);

  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel.meta, ObjectModel);

  const networkManager = new NetworkManager(feedStore, swarmProvider);
  const partyFactory = new PartyFactory(identityManager.keyring, feedStoreAdapter, modelFactory, networkManager);
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

  await partyManager.open();

  if (!identityManager.identityKey) {
    await identityManager.keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await partyManager.createHalo();
  }

  const database = new Database(partyManager);

  return { database, keyring };
};
