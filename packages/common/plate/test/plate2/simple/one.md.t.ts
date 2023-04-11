import template from './template.t';

export default template.text({
  content: ({ input }) => {
    return `name: ${input.name}`;
  }
});
