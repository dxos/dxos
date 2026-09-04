//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'tstyche';

import { type LogEntry, type QueryLogsRequest } from '@dxos/protocols/buf/dxos/client/logging_pb';
import {
  type LogEntry as LegacyLogEntry,
  type QueryLogsRequest as LegacyRequest,
} from '@dxos/protocols/proto/dxos/client/services';

// Carrier group E: `LoggingService.queryLogs` moved to `bufMessage` on both the payload and the
// response, so this pins both directions — the panel builds the request as well as reading entries.

declare const entry: LogEntry;
declare const request: QueryLogsRequest;

describe('LogEntry / QueryLogsRequest (group E)', () => {
  it('carry `$typeName`', () => {
    expect(entry.$typeName).type.toBe<'dxos.client.services.LogEntry'>();
    expect(request.$typeName).type.toBe<'dxos.client.services.QueryLogsRequest'>();
  });

  it('carries `timestamp` as a Timestamp, not a Date', () => {
    // protobuf.js substituted `google.protobuf.Timestamp` for `Date`; the panel now converts with
    // `timestampDate` at the point it renders.
    expect(entry.timestamp).type.not.toBeAssignableTo<Date | undefined>();
    expect(entry.timestamp?.nanos).type.toBe<number | undefined>();
  });

  it('exposes the nested enum under its flattened name', () => {
    // buf flattens `QueryLogsRequest.MatchingOptions` to `QueryLogsRequest_MatchingOptions`, which
    // is why every `===` against it had to move rather than being left alone.
    expect(request.options).type.not.toBeAssignableTo<LegacyRequest['options']>();
  });

  it('are no longer the protobuf.js types', () => {
    expect<LegacyLogEntry>().type.not.toBeAssignableTo<LogEntry>();
    expect<LegacyRequest>().type.not.toBeAssignableTo<QueryLogsRequest>();
  });
});
