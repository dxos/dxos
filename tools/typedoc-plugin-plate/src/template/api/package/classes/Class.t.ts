import os from "os";
import {
  ReflectionKind,
  Reflection,
  TraverseProperty,
  ParameterReflection,
  DeclarationReflection,
  SignatureReflection,
} from "typedoc";
import { Input, TemplateFunction, text, File } from "../..";

import { children, href, generic, method, comment } from "../..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const classes = input.project.getReflectionsByKind(ReflectionKind.Class);

  return classes.map((aclass) => {
    const members = children(aclass);
    const constructors = members.filter(
      (m) => m.kind == ReflectionKind.Constructor
    ) as DeclarationReflection[];
    const functions = members.filter(
      m => m.kind == ReflectionKind.FunctionOrMethod
    ) as DeclarationReflection[];
    const properties = members.filter(
      m => m.kind == ReflectionKind.VariableOrProperty
    ) as DeclarationReflection[];
    return new File({
      path: [
        outputDirectory,
        aclass.parent?.getFullName() ?? "",
        "classes",
        `${aclass.getAlias()}.md`,
      ],
      content: text`
        # Class \`${aclass.name}\`
        > Declared in [\`${aclass.sources?.[0]?.fileName}\`](${href(aclass)})

        ${comment(aclass)}

        ## Constructors
        ${constructors.map(method)}

        ## Properties
        ${properties.map(generic)}

        ## Functions
        ${functions.map(method)}
        `,
    });
  });
};

export default template;
