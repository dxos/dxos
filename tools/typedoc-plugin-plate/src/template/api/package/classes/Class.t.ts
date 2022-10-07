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
import stringify from "json-stringify-safe";

import { children, href, generic, method, comment } from "../..";

const t: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const classes = input.project.getReflectionsByKind(ReflectionKind.Class);

  return classes.map((aclass) => {
    const members = children(aclass);
    const constructors = members.filter(
      (m) => m.kind == ReflectionKind.Constructor
    );
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
        ${constructors.map((c) => method(c as DeclarationReflection))}
        
        ---
        ${generic(aclass)}
        `,
    });
  });
};

export default t;
