import { ReflectionKind } from "typedoc";
import { parseModuleSource } from "typedoc/dist/lib/converter/comments/declarationReference";
import { Input, TemplateFunction, text } from ".";

const template: TemplateFunction<Input> = ({ input }) => {
  const modules = input.project.getReflectionsByKind(ReflectionKind.Module);
  return text`
# DXOS
## Packages:
${modules.map(m => `- ${m.getFriendlyFullName()}`)}
`;
};

export default template;
