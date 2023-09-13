import { plate } from '..';
import template from './template.t';

export default template.define
  .slots({
    prop: 'simple'
  })
  .script({
    content: ({ input, slots, imports }) => {
      const foo = imports.use('foo', '.');
      return plate`
      ${imports}
      const bar = ${foo};
      const name = '${input.name}';
      const slot = '${slots.prop}';
      `;
    }
  });
