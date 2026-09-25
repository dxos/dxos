//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'tstyche';

import {
  type LogEntry,
  type QueryLogsRequest,
  QueryLogsRequest_MatchingOptions,
} from '@dxos/protocols/buf/dxos/client/logging_pb';

// `LoggingService.queryLogs` carries buf messages in both directions, so this pins both — the panel
// builds the request as well as reading entries.

declare const entry: LogEntry;
declare const request: QueryLogsRequest;

describe('LogEntry / QueryLogsRequest', () => {
  it('carry `$typeName`', () => {
    expect(entry.$typeName).type.toBe<'dxos.client.services.LogEntry'>();
    expect(request.$typeName).type.toBe<'dxos.client.services.QueryLogsRequest'>();
  });

  it('carries `timestamp` as a Timestamp, not a Date', () => {
    // The panel converts with `timestampDate` at the point it renders.
    expect(entry.timestamp).type.not.toBeAssignableTo<Date | undefined>();
    expect(entry.timestamp?.nanos).type.toBe<number | undefined>();
  });

  it('exposes the nested enum under its flattened name', () => {
    // buf flattens `QueryLogsRequest.MatchingOptions`, which is why every `===` against it moved.
    expect(request.options).type.toBeAssignableTo<QueryLogsRequest_MatchingOptions | undefined>();
  });
});
