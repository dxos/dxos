import { plate } from "@dxos/plate";
import template from "./template.t";

export default template.define.script({
  content: ({ input, imports }) => plate`
    ${imports}

    export const TEMPLATE_PLUGIN_ID = 'dxos.org/plugin/template';
    
  `
})