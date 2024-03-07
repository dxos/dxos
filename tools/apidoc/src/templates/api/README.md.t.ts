import { plate } from '@dxos/plate';
import template from './template.t.js';
import { href, packagesInProject } from './util.t/index.js';

export default template.define.text({
  content: ({ input }) => {
    const modules = packagesInProject(input);
    return plate`
      # DXOS API Documentation

      This reference documentation was [generated automatically](/guide/contributing/documentation#generated-documentation) from source.

      To get started with DXOS components and learn how to use them, check out the [guide](/guide/).

      ## Packages:
      ${modules.map((m) => `- [${m.name}](${href.package(m.name)})`)}
      `;
  },
});
