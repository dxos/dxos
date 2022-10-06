import { ReflectionKind } from "typedoc";
import { Input, TemplateFunction, text, File } from "..";

const t: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const modules = input.project.getReflectionsByKind(ReflectionKind.Module);
  return modules.map(
    (module) =>
      new File({
        path: [outputDirectory, module.getFriendlyFullName(), "README.md"],
        content: text`# Package ${module.getFriendlyFullName()}`,
      })
  );
};

export default t;
