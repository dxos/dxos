import { ReflectionKind } from "typedoc";
import { Input, TemplateFunction, text, File } from "../..";

const t: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const classes = input.project.getReflectionsByKind(ReflectionKind.Class);
  return classes.map(
    (aclass) =>
      new File({
        path: [
          outputDirectory,
          aclass.parent?.getFullName() ?? "",
          'classes',
          `${aclass.getAlias()}.md`
        ],
        content: text`# Class ${aclass.getFriendlyFullName()}`,
      })
  );
};

export default t;
