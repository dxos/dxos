import { plate } from '@dxos/plate';
import template from '../../template.t';

export default template.define.script({
  content: ({ input: { proto } }) => proto && plate`export * from './gen/schema';`,
});
