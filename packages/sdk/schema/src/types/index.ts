//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';

import * as Collection from './Collection';
import * as Text from './Text';
import * as View from './View';

export { Collection, Text, View };

export const DataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  Type.PersistentType,

  // System
  Collection.Collection,
  Collection.Managed,
  Text.Text,
  View.View,
];
