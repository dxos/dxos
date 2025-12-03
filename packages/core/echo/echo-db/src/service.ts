//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import {
  type Entity,
  Err,
  type Filter,
  Obj,
  type Query,
  type QueryResult,
  type Ref,
  type SchemaRegistry,
  type Type,
} from '@dxos/echo';
import { promiseWithCauseCapture } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type DXN } from '@dxos/keys';
import { type Live } from '@dxos/live-object';

import type { EchoDatabase } from './proxy-db';


