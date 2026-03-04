//
// Copyright 2023 DXOS.org
//

import { type LogEntry } from '@dxos/protocols/buf/dxos/client/logging_pb';
import { type Resource, type Span } from '@dxos/protocols/buf/dxos/tracing_pb';

export type ResourceState = {
  resource: Resource;
  spans: Span[];
  logs: LogEntry[];
};

export type State = {
  resources: Map<number, ResourceState>;
  spans: Map<number, Span>;
};
