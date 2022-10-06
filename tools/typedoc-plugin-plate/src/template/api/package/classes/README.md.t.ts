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
        content: text`
        # Class ${aclass.name}
        > Declared in package \`${aclass.parent?.getFullName()}\`
        ${aclass.comment?.summary?.map(s => s.text)}

        ## Fields

        ## Methods

        `,
      })
  );
};

export default t;
