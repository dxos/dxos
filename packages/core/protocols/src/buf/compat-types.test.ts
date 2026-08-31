//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Timeframe } from '@dxos/timeframe';

import { type MutationMeta as LegacyMutationMeta } from '../proto/gen/dxos/echo/object.ts';
import { type UserState as LegacyUserState } from '../proto/gen/dxos/edge/calls.ts';
import {
  type Credential as LegacyCredential,
  type Presentation as LegacyPresentation,
} from '../proto/gen/dxos/halo/credentials.ts';
import { type KeyRecord as LegacyKeyRecord } from '../proto/gen/dxos/halo/keyring.ts';
import {
  type Message as LegacySignalMessage,
  type SwarmEvent as LegacySwarmEvent,
} from '../proto/gen/dxos/mesh/signal.ts';
import { type Compat } from './compat-types.ts';
import { type MutationMeta as BufMutationMeta } from './proto/gen/dxos/echo/object_pb.ts';
import { type TimeframeVector as BufTimeframeVector } from './proto/gen/dxos/echo/timeframe_pb.ts';
import { type UserState as BufUserState } from './proto/gen/dxos/edge/calls_pb.ts';
import {
  type Credential as BufCredential,
  type Presentation as BufPresentation,
} from './proto/gen/dxos/halo/credentials_pb.ts';
import { type KeyRecord as BufKeyRecord } from './proto/gen/dxos/halo/keyring_pb.ts';
import { type Message as BufSignalMessage, type SwarmEvent as BufSwarmEvent } from './proto/gen/dxos/mesh/signal_pb.ts';

/**
 * Pins `Compat` to the protobuf.js shape by assigning a legacy-typed value into it — the direction
 * that holds, since `Compat` widens field presence (see its doc comment). Compiles against the
 * protobuf.js generated types, and is deleted along with them.
 */
describe('Compat', () => {
  test('mirrors the protobuf.js shape of a credential', () => {
    const check = (value: LegacyCredential): Compat<BufCredential> => value;
    void check;
  });

  test('mirrors the protobuf.js shape of a presentation', () => {
    const check = (value: LegacyPresentation): Compat<BufPresentation> => value;
    void check;
  });

  test('flattens a oneof group into sibling fields', () => {
    const check = (value: LegacySwarmEvent): Compat<BufSwarmEvent> => value;
    void check;
  });

  test('substitutes a private key', () => {
    const check = (value: LegacyKeyRecord): Compat<BufKeyRecord> => value;
    void check;
  });

  test('substitutes a timeframe', () => {
    const check = (value: Timeframe): Compat<BufTimeframeVector> => value;
    void check;
  });

  test('substitutes Struct and Any in one message', () => {
    const check = (value: LegacySignalMessage): Compat<BufSignalMessage> => value;
    void check;
  });

  test('preserves enums and nested messages', () => {
    const check = (value: LegacyMutationMeta): Compat<BufMutationMeta> => value;
    void check;
  });

  test('preserves map fields', () => {
    const check = (value: LegacyUserState): Compat<BufUserState> => value;
    void check;
  });
});
