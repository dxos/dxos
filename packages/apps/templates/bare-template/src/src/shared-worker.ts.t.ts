//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react }}) => {
    return (
      plate`
        onconnect = async (event) => {
          // Worker code must be async imported due to WASM + top-level await breaking the connect.
          // See: https://github.com/Menci/vite-plugin-wasm/issues/37
          const { onconnect } = await import('@dxos/${react ? 'react-client' : 'client'}/worker');
          await onconnect(event);
        };
      `
    );
  },
});
