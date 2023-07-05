import { template } from '..';

export default template().group((context) => [
  template().text({
    content: 'some content'
  }),
  template().slots({ name: 'foo' }).text({
    content: ({ slots }) => `content was slots ${slots?.name}`
  })
]);
