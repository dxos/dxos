import template from './template.t';

export default template.text({
  content: ({ input, slots }) => {
    return `static content, slots.foo = ${slots.foo}`;
  },
  foo: 'default content here'
});
