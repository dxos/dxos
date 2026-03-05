//
// Copyright 2025 DXOS.org
//

import { Type, View, Collection } from '@dxos/echo';

import * as Expando from './Expando';
import * as Text from './Text';
import * as CollectionModel from './CollectionModel';
import * as ManagedCollection from './ManagedCollection';

export { Collection, Expando, Text, CollectionModel, ManagedCollection };

export const DataTypes: Type.Entity.Any[] = [
  Type.Feed,
  Type.PersistentType,

  // System
  Collection.Collection,
  ManagedCollection.ManagedCollection,
  Expando.Expando,
  Text.Text,
  View.View,
];
