//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Push down. Openable, Startable, etc.
export interface Service {
  open(): Promise<void>;
  close(): Promise<void>;
}

export interface Plugin {
  start(): Promise<void>;
  stop(): Promise<void>;
}
