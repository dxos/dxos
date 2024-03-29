import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react } }) => {
    return (
      react &&
      plate`
    {
      // Place your dxos workspace snippets here. Each snippet is defined under a snippet name and has a scope, prefix, body and 
      // description. Add comma separated ids of the languages where the snippet is applicable in the scope field. If scope 
      // is left empty or omitted, the snippet gets applied to all languages. The prefix is what is 
      // used to trigger the snippet and the body will be expanded and inserted. Possible variables are: 
      // $1, $2 for tab stops, $0 for the final cursor position, and \${1:label}, \${2:another} for placeholders. 
      // Placeholders with the same ids are connected.
      // Example:
      // "Print to console": {
      // 	"scope": "javascript,typescript",
      // 	"prefix": "log",
      // 	"body": [
      // 		"console.log('$1');",
      // 		"$2"
      // 	],
      // 	"description": "Log output to console"
      // }
      "component": {
        "scope": "typescriptreact",
        "prefix": "component",
        "body": [
          "import React from 'react';",
          "",
          "export type $1Props = {$2};",
          "export const \${1:Component} = (props: $1Props) => {",
          "  return <>$0</>;",
          "}"
        ]
      }
    }
    `
    );
  },
});
