import { plate } from '@dxos/plate';
import template from '../template.t';

// for some reason ts-node doesn't lile to load this
// file if it is named __pwa.d.ts.t.ts
// workaround is to name it __pwa-d.ts.t.ts and emit a path in template.define.text

export default template.define.text({
  path: 'src/__pwa.d.ts',
  content: ({ input: { pwa } }) =>
    pwa &&
    plate`/// <reference types="vite-plugin-pwa/client" />`,
});
