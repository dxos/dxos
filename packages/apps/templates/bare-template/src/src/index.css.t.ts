import { text } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { dxosUi, tailwind } }) =>
    !dxosUi &&
    text`
      ${
        tailwind &&
        text`
        @tailwind base;
        @tailwind components;
        @tailwind utilities;`
      }`,
});
