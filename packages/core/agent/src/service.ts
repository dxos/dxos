//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Push down.
export interface Service {
  open(): Promise<void>;
  close(): Promise<void>;
}
