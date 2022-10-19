import { Input, TemplateFunction, text, packagesInProject } from ".";

const template: TemplateFunction<Input> = ({ input }) => {
  const modules = packagesInProject(input);
  return text`
  # DXOS
  ## Packages:
  ${modules.map((m) => `- ${m.name}`)}
  `;
};

export default template;
