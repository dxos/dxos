//
// Copyright 2020 DXOS.org
//

export interface TestNode {
  id: string;
  type?: string;
  label?: string;
  children?: TestNode[];
}
