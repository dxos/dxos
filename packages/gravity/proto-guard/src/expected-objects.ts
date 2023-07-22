//
// Copyright 2023 DXOS.org
//

import { PropertiesProps } from '@dxos/client/echo';

export const expectedEpoch = 1;

export const expectedProperties: PropertiesProps = {
  name: 'PROTO_GUARD_SPACE',
};

export const expectedExpando: Record<string, any> & { type: 'expando' } = {
  type: 'expando',
  in: 'such',
  manner: ['we', 'will', 'test', 'if', 'expando', 'loads', 'correctly'],
};

export const expectedText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
  Sed ullamcorper nunc est, ut auctor enim auctor vitae. Proin dapibus mattis velit, 
  sodales tempor leo lobortis eu. Maecenas consequat diam at tempus imperdiet. 
  Curabitur a semper justo. Curabitur egestas vestibulum est. Sed faucibus.`;
