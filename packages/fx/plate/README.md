# Templates in TypeScript

```ts
import { executeDirectoryTemplate } from "@nice/plate";

const result = await executeDirectoryTemplate({
  templatePath: '/path to folder',
  outputDir: '/...',
  input: {
    ...
  }
})
```