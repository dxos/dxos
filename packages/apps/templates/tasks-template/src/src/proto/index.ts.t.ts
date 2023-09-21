import { plate } from "@dxos/plate";
import template from '../../template.t';

export default template.define.script({
  content: plate`export * from './gen/schema';`
});


