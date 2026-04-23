//
// Copyright 2025 DXOS.org
//

import { Collection, Feed, Type, View } from '@dxos/echo';

import * as CollectionModel from './CollectionModel';
import * as Expando from './Expando';
import * as Text from './Text';
import * as ViewModel from './ViewModel';

export { Expando, Text, CollectionModel, ViewModel };

export const DataTypes: Type.AnyEntity[] = [
  Collection.Collection,
  Expando.Expando,
  Feed.Feed,
  Text.Text,
  Type.PersistentType,
  View.View,
];
