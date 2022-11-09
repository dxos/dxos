import { Input } from './index';
import { href, packagesInProject } from './util.t';
import { TemplateFunction, text } from '@dxos/plate';

const template: TemplateFunction<Input> = ({ input }) => {
  const modules = packagesInProject(input);
  return text`
  # DXOS API Documentation

  > Version hash <Badge type="tip" text="cafebabe" vertical="middle" />

  This is reference documentation that was [generated automatically](/guide/contributing/documentation#generated-documentation) from source.

  To get started with DXOS components and learn how to use them, check out the [guide](/guide).

  ## Packages:
  ${modules.map((m) => `- [${m.name}](${href.package(m.name)})`)}
  `;
};

export default template;
