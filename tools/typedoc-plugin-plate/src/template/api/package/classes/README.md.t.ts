import os from "os";
import { ReflectionKind, Reflection, TraverseProperty, ParameterReflection, DeclarationReflection, SignatureReflection } from "typedoc";
import { Input, TemplateFunction, text, File } from "../..";
import stringify from "json-stringify-safe";

const children = (ref: Reflection, kind?: ReflectionKind) => {
  const results: Reflection[] = [];
  ref.traverse((reflection) => {
    if (typeof kind == "undefined" || reflection.kind == kind)
      results.push(reflection);
  });
  return results;
};

const tabs = (i: number = 0) => new Array(i).fill("  ").join("");

const generic = (ref: Reflection, indent: number = 0): string => {
  return text`
  ${tabs(indent)}- ${ref.name} : ${ref.kindString}
  ${children(ref).map((e) => generic(e, indent + 1))}
  `;
};

const comment = (ref: Reflection) => {
  return text`${ref.comment?.summary?.map(s => s.text).join(' ')}`;
}

const param = (ref: ParameterReflection) => {
  return text`${ref.name}: ${ref.type}`;
}

const signature = (ref: SignatureReflection): string => {
  return text`
  \`\`\`ts
  ${ref.name}(
    ${ref.parameters?.map(param).join(',' + os.EOL)}
  )
  \`\`\`
  ${comment(ref)}
  `;
}

const method = (ref: DeclarationReflection): string => {
  return text`
  ${ref.getAllSignatures()?.map(signature)}
  `;
}

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
        > Declared in package \`${aclass.parent?.getFullName()}\`

        ${comment(aclass)}

        ## Constructors
        ${constructors.map((c) => method(c as DeclarationReflection))}
        `,
    });
  });
};

export default t;
