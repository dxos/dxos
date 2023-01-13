import { defineTemplate, text, File } from '../..';
import { Input } from './config.t';

export default defineTemplate<Input>(({ input, defaultOutputFile }) => {
  const { name, bar } = input;
  return [
    ...(bar
      ? [
          new File({
            path: defaultOutputFile,
            content: text`
            # foo.md
            bar is true. name is ${name}
            `
          })
        ]
      : [])
  ];
});
