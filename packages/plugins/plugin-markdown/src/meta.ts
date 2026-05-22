//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.markdown',
  name: 'Markdown',
  author: 'DXOS',
  description: trim`
    Full-featured collaborative markdown editor with real-time editing, inline comments, and rich formatting.
    Supports AI-powered editing assistance and seamlessly integrates with other workspace objects.
  `,
  icon: 'ph--text-aa--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-markdown',
  screenshots: [
    'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/cdf2656365bb1fd327c1fc2105d75e5a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Fcdf2656365bb1fd327c1fc2105d75e5a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
    'https://dxos.network/plugin-details-markdown-dark.png',
  ],
};
