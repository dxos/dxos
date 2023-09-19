import { plate } from '@dxos/plate';
import template from './template.t';

export default template.define.text({
  content() {
    return plate`
    node_modules
    out
    `;
  },
});
