import { ReflectionKind, Reflection } from "typedoc";
import { Input, TemplateFunction, text, File } from "../..";

const t: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const classes = input.project.getReflectionsByKind(ReflectionKind.Class);
  const getReflectionsByKind = (ref: Reflection, kind: ReflectionKind) => {
    const results: Reflection[] = [];
    ref.traverse((reflection, property) => {
      results.push(reflection);
      if (reflection.kind == kind) {
      }
    });
    return results;
  };
  return classes.map((aclass) => {
    const members = getReflectionsByKind(aclass, ReflectionKind.ClassMember);

    return new File({
      path: [
        outputDirectory,
        aclass.parent?.getFullName() ?? "",
        "classes",
        `${aclass.getAlias()}.md`,
      ],
      content: text`
        # Class \`${aclass.name}\`
        > Declared in package \`${aclass.parent?.getFullName()}\`

        ${aclass.comment?.summary?.map((s) => s.text).join(' ')}

        ## Members
        ${members.map((member) => '- ' + member.getFriendlyFullName())}
        `,
    });
  });
};

export default t;
