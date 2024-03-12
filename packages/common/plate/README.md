# Templates in TypeScript

This package is for templating files and folders on disk using purely TypeScript (as opposed to some other language like handlebars, cjs, ... etc).

Template literal strings are a great way to express templates in TypeScript, while enjoying all the type safety benefits. With certain extensions to `vscode` even dual-syntax highlighting can become possible. (e.g. see [`zjcompt.es6-string-javascript`](https://marketplace.visualstudio.com/items?itemName=zjcompt.es6-string-javascript))

To write a typescript template, simply deposit a file with a name ending in `.t.ts`. The contents of that file will be executed and the module is expected to return a single default template function.