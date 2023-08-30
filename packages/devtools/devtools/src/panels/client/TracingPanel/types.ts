//
// Copyright 2023 DXOS.org
//

import { LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { Resource, Span } from '@dxos/protocols/proto/dxos/tracing';

export type ResourceState = {
  resource: Resource;
  spans: Span[];
  logs: LogEntry[];
};

export type State = {
  resources: Map<number, ResourceState>;
  spans: Map<number, Span>;
};
