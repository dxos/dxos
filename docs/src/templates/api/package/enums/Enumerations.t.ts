import { ReflectionKind, JSONOutput as S } from "typedoc";
import { Input, TemplateFunction, text, File, JSONFile } from "../..";

import {
  children,
  href,
  generic,
  method,
  comment,
  packagesInProject,
  reflectionsOfKind,
  property,
} from "../..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const enums = reflectionsOfKind(
        pkage,
        ReflectionKind.Enum
      ) as S.ContainerReflection[];
      return enums
        .map((aenum) => {
          const members = reflectionsOfKind(
            aenum,
            ReflectionKind.EnumMember
          ) as S.DeclarationReflection[];
          const sourceFileName = aenum.sources?.[0]?.fileName;
          const dir = [outputDirectory, pkage.name ?? "", "enums"];
          return [
            new File({
              path: [...dir, `${aenum.name}.md`],
              content: text`
                # Enumeration \`${aenum.name}\`
                > Declared in [\`${sourceFileName}\`]()

                ${comment(aenum.comment)}

                ## Members
                ${members.map((member) => `## \`${member.name}\``)}
                `,
            }),
            // new JSONFile({
            //   path: [...dir, `${aenum.name}.json`],
            //   content: aenum,
            // }),
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
