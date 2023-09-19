import { template } from '..';

export default template<{ name: string }>().text({
  content({ input }) {
    return `the name was ${input.name}`;
  }
});
