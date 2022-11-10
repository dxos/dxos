//
// Copyright 2022 DXOS.org
//

import { resources } from './src/translations';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    resources: typeof resources['en-US']
  }
}
