import template from './template.t';

export default template.define
  .slots({
    prop: 'default prop'
  })
  .text({
    content: ({ input, slots }) => {
      return `name: ${input.name}, slots.prop = ${slots?.prop}`;
    }
  });
