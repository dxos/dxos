//
// Copyright 2020 DXOS.org
//

import { Item } from '@dxos/echo-db';

export interface ItemAdapter {
  key: (key: any) => string
  primary: (value: any) => string
  secondary?: (value: any) => string
  icon?: React.FunctionComponent<{item: Item<any>}>
  slices?: (item: any) => JSX.Element[]
}
