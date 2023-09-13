import { plate } from '..';
import template from './template.t';

export default template.define
  .slots({
    prop: 'simple'
  })
  .script({
    content: ({ input, slots, imports }) => {
      return plate`
      ${imports}
      const name = '${input.name}';
      const slot = '${slots.prop}';
      `;
    }
  });
