//
// Copyright 2025 DXOS.org
//

import { Collection, Type, View } from '@dxos/echo';

import * as CollectionModel from './CollectionModel';
import * as Expando from './Expando';
import * as ManagedCollection from './ManagedCollection';
import * as Text from './Text';
import * as ViewModel from './ViewModel';

export { Expando, Text, CollectionModel, ManagedCollection, ViewModel };

export const DataTypes: Type.AnyEntity[] = [
  Feed.Feed,
  Type.PersistentType,

  // System
  Collection.Collection,
  ManagedCollection.ManagedCollection,
  Expando.Expando,
  Text.Text,
  View.View,
];
