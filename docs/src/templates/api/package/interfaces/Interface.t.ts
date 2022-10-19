import os from "os";
import { ReflectionKind, JSONOutput as S } from "typedoc";
import {
  Input,
  TemplateFunction,
  text,
  File,
  reflectionsOfKind,
  packagesInProject,
  property,
  comment
} from "../..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const ifaces = reflectionsOfKind(
        pkage,
        ReflectionKind.Interface
      ) as S.ContainerReflection[];
      const interfacesDir = [outputDirectory, pkage.name ?? "", "interfaces"];
      return ifaces.map((iface) => {
        const sourceFileName = iface.sources?.[0]?.fileName;
        const properties = reflectionsOfKind(iface, ReflectionKind.Property);
        return new File({
          path: [...interfacesDir, `${iface.name}.md`],
          content: text`
          # Interface \`${iface.name}\`
          > Declared in [\`${sourceFileName}\`]()

          ${comment(iface)}
          ## Properties
          ${properties.map(property)}
        `,
        });
      });
    })
    .flat();
};

export default template;
