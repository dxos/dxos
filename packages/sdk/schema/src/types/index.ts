//
// Copyright 2025 DXOS.org
//

import { Collection, Feed, Type, View } from '@dxos/echo';

import * as Expando from './Expando';
import * as Text from './Text';
import * as ViewModel from './ViewModel';

export { Expando, Text, ViewModel };
export { APIKey } from './APIKey';

export const DataTypes: Type.AnyEntity[] = [
  Collection.Collection,
  Expando.Expando,
  Feed.Feed,
  Text.Text,
  Type.Type,
  View.View,
];
