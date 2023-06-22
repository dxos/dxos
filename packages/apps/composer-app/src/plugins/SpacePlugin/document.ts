//
// Copyright 2023 DXOS.org
//

import { Document } from '@braneframe/types';
import { isTypedObject } from '@dxos/client';

export const isDocument = (datum: unknown): datum is Document =>
  isTypedObject(datum) && Document.type.name === datum.__typename;
