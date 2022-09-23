# Templates in TypeScript
This package is for templating files and folders on disk using purely TypeScript (as opposed to some other language like handlebars, cjs, ... etc).

Template literal strings are a great way to express templates in TypeScript, while enjoying all the type safety benefits. With certain extensions to `vscode` even dual-syntax highlighting can become possible. (e.g. see [`zjcompt.es6-string-javascript`](https://marketplace.visualstudio.com/items?itemName=zjcompt.es6-string-javascript))

To write a typescript template, simply deposit a file with a name ending in `.t.ts`. The contents of that file will be executed and the module is expected to return a single default function of type `TemplateFunction` from `@dxos/plate`.
```typescript
type TemplateFunction = (input: TemplateContext<TInput>) => MaybePromise<string | File[]>;

type MaybePromise<T> = T | Promise<T>
```
As you can see the template function's job is to convert an input into an output which can be emitted as one or more files. If the output is a string, the current template filename stripped of `t.ts` will be used. Otherwise the template is free to describe multiple files it wants to emit by returning an array of `File` type from `@dxos/file`. 

```ts
type File = {
  path: string | string[]; // can be eg.: ['path', 'to', 'file.json']
  content: string;
  async save();
  // + more useful stuff
}
```

See below for [`TemplateContext`](#templatecontext)

## API

This package offers two entry points:

### `executeFileTemplate(options: Options<TInput>): Promise<TemplatingResult>`
This API executes a single `t.ts` file and returns the intended list of Files to write to disk.

Where:
```typescript
type Options<TInput> = {
  templateFile: string;  // path to the *.t.ts template file to evaluate
  templateRelativeTo?: string; // if templateFile is relative, it's relative to this folder path
  outputDirectory: string; // the path of a folder where the output will go
  input?: TInput; // any input for the template function
}

type TemplatingResult = File[]; // file is from @dxos/file
```
You can call `await File.save()` to save the files resulting from the template execution such as 
```typescript
await Promise.all(
  (await executeFileTemplate({
    // options
  }))
  .map(f => f.save())
)`
```

### `executeDirectoryTemplate()`
This API walks all files in a given directory recursively, identifies all the `t.ts` templates, executes them, and produces a final result of `File[]` which represent the work to copy all non-template files as-is and combine them with the files resulting from templating.

> Note that template outputs take precedence over copies of non-template files. I.e. if `package.json.t.ts` intends to produce `package.json` it will override the regular copy of `package.json` should one exist in the template folder next to `package.json.t.ts`
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

## Types

### `TemplateContext`
```typescript
type TemplateContext<T> = {
  // the path to the currently executing t.ts template file
  templateFile: string;
  // the relativeTo setting that was passed in as an option to executeFileTemplate
  templateRelativeTo?: string;
  // the destination folder
  outputDirectory: string;
  // any context input the template received
  input?: T;
  // the name of the current template minus the `t.ts` part at the end
  defaultOutputFile: string;
}
```