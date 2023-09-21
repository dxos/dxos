import { template, plate } from '..';

export default template().group((context) => [
  template().text({
    path: 'content-1.md',
    content: 'some content',
  }),
  template()
    .slots({ name: 'foo' })
    .text({
      path: 'content-2.md',
      content: ({ slots }) => plate`content was slots ${slots?.name}`,
    }),
]);
