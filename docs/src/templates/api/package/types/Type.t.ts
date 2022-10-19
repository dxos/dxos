import { ReflectionKind, JSONOutput as S } from "typedoc";
import {
  Input,
  TemplateFunction,
  text,
  sources,
  File,
  JSONFile,
  comment,
  packagesInProject,
  reflectionsOfKind,
  stringifyType,
} from "../..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const types = reflectionsOfKind(
        pkage,
        ReflectionKind.TypeAlias
      ) as S.DeclarationReflection[];
      return types
        .map((atype) => {
          const members = atype.children ?? [];
          const sourceFileName = atype.sources?.[0]?.fileName;
          const dir = [outputDirectory, pkage.name ?? "", "types"];
          return [
            new File({
              path: [...dir, `${atype.name}.md`],
              content: text`
                # Type alias \`${atype.name}\`
                ${sources(atype)}

                ${comment(atype.comment)}

                \`\`\`ts
                type ${atype.name} = ${stringifyType(atype.type!)}
                \`\`\`
                `,
            }),
            // new JSONFile({
            //   path: [...dir, `${atype.name}.json`],
            //   content: atype,
            // }),
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
