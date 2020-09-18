//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import leveljs from 'level-js';
import React, { useEffect, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs, number } from '@storybook/addon-knobs';
import { makeStyles } from '@material-ui/core/styles';
import { blueGrey } from '@material-ui/core/colors';

import { FullScreen, Grid, SVG, useGrid } from '@dxos/gem-core';
import { Markers } from '@dxos/gem-spore';
import { createId } from '@dxos/crypto';
import { FeedStore } from '@dxos/feed-store';
import {
  codec, Database, PartyManager, PartyFactory, FeedStoreAdapter, IdentityManager
} from '@dxos/experimental-echo-db';
import { Keyring, KeyType, KeyStore } from '@dxos/credentials';
import { ObjectModel } from '@dxos/experimental-object-model';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { NetworkManager, SwarmProvider } from '@dxos/network-manager';
import { createStorage } from '@dxos/random-access-multi-storage';
import ram from 'random-access-memory';

export const createDatabase = async ({ storage = ram, keyStorage = undefined } = {}) => {
  const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });
  const feedStoreAdapter = new FeedStoreAdapter(feedStore);

  let identityManager;
  {
    const keystore = new KeyStore(keyStorage);
    const keyring = new Keyring(keystore);
    await keyring.load();
    identityManager = new IdentityManager(keyring);
  }

  const modelFactory = new ModelFactory()
    .registerModel(ObjectModel.meta, ObjectModel);

  const networkManager = new NetworkManager(feedStore, new SwarmProvider());
  const partyFactory = new PartyFactory(identityManager.keyring, feedStoreAdapter, modelFactory, networkManager);
  const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);

  await partyManager.open();

  if (!identityManager.identityKey) {
    await identityManager.keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await partyManager.createHalo();
  }

  return new Database(partyManager);
};
