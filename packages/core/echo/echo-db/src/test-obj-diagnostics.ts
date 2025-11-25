// Diagnostic to see what Obj.Any actually resolves to

import { type Obj } from '@dxos/echo';
import { type HasId } from '@dxos/echo/internal';
import * as Schema from 'effect/Schema';

// Check if it's the schema type
type IsSchemaType = Obj.Any extends Schema.Schema.AnyNoContext ? 'IS_SCHEMA_TYPE' : 'NOT_SCHEMA_TYPE';

// Check if it extends HasId
type ExtendsHasId = Obj.Any extends HasId ? 'EXTENDS_HAS_ID' : 'DOES_NOT_EXTEND_HAS_ID';

// Force show the actual type
const showType: Obj.Any = null as any;

// Check what properties are available
type PropertiesOfObjAny = keyof Obj.Any;

export type Diagnostics = {
  isSchemaType: IsSchemaType;
  extendsHasId: ExtendsHasId;
  properties: PropertiesOfObjAny;
};
