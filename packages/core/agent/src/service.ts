//
// Copyright 2023 DXOS.org
//

export interface Service {
  open(): Promise<void>;
  close(): Promise<void>;
}
