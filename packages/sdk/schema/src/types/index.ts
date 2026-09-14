//
// Copyright 2025 DXOS.org
//

import { Collection, Feed, Type, View } from '@dxos/echo';

import * as StateMap from '../StateMap.ts';
import * as TagIndex from '../TagIndex.ts';
import * as Expando from './Expando.ts';
import * as Text from './Text.ts';
import * as ViewModel from './ViewModel.ts';

export { Expando, Text, ViewModel };
export { APIKey } from './APIKey.ts';

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
