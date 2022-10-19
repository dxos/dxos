import { Input, TemplateFunction, text, getModulesInProject } from ".";

const template: TemplateFunction<Input> = ({ input }) => {
  const modules = getModulesInProject(input);
  return text`
  # DXOS
  ## Packages:
  ${modules.map((m) => `- ${m.name}`)}
  `;
};

export default template;
