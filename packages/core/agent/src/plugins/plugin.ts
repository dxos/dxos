//
// Copyright 2023 DXOS.org
//

export interface Plugin {
  open(): Promise<void>;
  close(): Promise<void>;
}
