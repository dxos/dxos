//
// Copyright 2025 DXOS.org
//

import { Collection, Feed, Type, View } from '@dxos/echo';

import * as StateMap from '../StateMap';
import * as TagIndex from '../TagIndex';
import * as Expando from './Expando';
import * as Text from './Text';
import * as ViewModel from './ViewModel';

export { Expando, Text, ViewModel };
export { APIKey } from './APIKey';

export const DataTypes: Type.AnyEntity[] = [
  Collection.Collection,
  Expando.Expando,
  Feed.Feed,
  StateMap.StateMap,
  TagIndex.TagIndex,
  Text.Text,
  Type.Type,
  View.View,
];
