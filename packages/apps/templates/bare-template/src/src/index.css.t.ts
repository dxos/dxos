import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { dxosUi, tailwind } }) =>
    !dxosUi &&
    plate`
      ${
        tailwind &&
        plate`
        @tailwind base;
        @tailwind components;
        @tailwind utilities;`
      }`,
});
