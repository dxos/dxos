import { TemplateFunction, text } from '@dxos/plate';
import { Input } from './index.js';
import { href, packagesInProject } from './util.t/index.js';

const template: TemplateFunction<Input> = ({ input }) => {
  const modules = packagesInProject(input);
  return text`
  # DXOS API Documentation

  This reference documentation was [generated automatically](/guide/contributing/documentation#generated-documentation) from source.

  To get started with DXOS components and learn how to use them, check out the [guide](/guide/).

  ## Packages:
  ${modules.map((m) => `- [${m.name}](${href.package(m.name)})`)}
  `;
};

export default template;
