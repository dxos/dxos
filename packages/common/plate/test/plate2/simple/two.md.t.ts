import template from './template.t';

export default template.text({
  content: ({ input, slots }) => {
    return `hello ${input.name}`;
  }
});
