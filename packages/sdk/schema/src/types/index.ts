//
// Copyright 2025 DXOS.org
//

import { type Type } from '@dxos/echo';
import { StoredSchema as StoredSchema$ } from '@dxos/echo/internal';

import * as Collection from './Collection';
import * as Text from './Text';
import * as View from './View';

export { StoredSchema } from '@dxos/echo/internal';

export { Collection, Text, View };

export const DataTypes: (Type.Obj.Any | Type.Relation.Any)[] = [
  StoredSchema$,

  // System
  Collection.Collection,
  Collection.QueryCollection,
  Text.Text,
  View.View,
];
