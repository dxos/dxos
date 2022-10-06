import { ReflectionKind } from "typedoc";
import { Input, TemplateFunction, text } from ".";

const t: TemplateFunction<Input> = ({ input }) => {
  const modules = input.project.getReflectionsByKind(ReflectionKind.Module);
  return text`
# DXOS
project.reflections[module]:
${modules.map(m => `- ${m.getFriendlyFullName()}`)}
`;
};

export default t;
