import path from "path";
import { ReflectionKind } from "typedoc";
import { Input, TemplateFunction, text, File, generic } from "..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const modules = input.project.getReflectionsByKind(ReflectionKind.Module);
  return modules.map(
    (module) => {
      const source = module.sources?.[0].fileName!;
      const packageReadme = source.replace("src/index.ts", "README.md");
      return new File({
        path: [outputDirectory, module.name, 'README.md'],
        copyFrom: path.resolve(process.cwd(), '..', packageReadme)
      })
    }
  );
};

export default template;
