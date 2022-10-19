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
  // const ifaces = input.project.getReflectionsByKind(ReflectionKind.Interface);
  const ifaces: any[] = [];
  return ifaces.map((iface) => {
    const members = children(iface);
    const functions = members.filter(
      (m) =>
        m.kind == ReflectionKind.Function || m.kind == ReflectionKind.SomeMember
    ) as DeclarationReflection[];
    return new File({
      path: [
        outputDirectory,
        iface.parent?.getFullName() ?? "",
        "interfaces",
        `${iface.getAlias()}.md`,
      ],
      content: text`
        # Interface \`${iface.name}\`
        > Declared in [\`${iface.sources?.[0]?.fileName}\`](${href(iface)})

        ${comment(iface)}
        
        `,
    });
  });
};

// export default template;
