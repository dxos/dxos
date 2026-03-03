//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';

import * as Collection from './Collection';
import * as Expando from './Expando';
import * as Text from './Text';
import * as View from './View';

export { Collection, Expando, Text, View };

export const DataTypes: Type.Entity.Any[] = [
  Type.Feed,
  Type.PersistentType,

  // System
  Collection.Collection,
  Collection.Managed,
  Expando.Expando,
  Text.Text,
  View.View,
];
