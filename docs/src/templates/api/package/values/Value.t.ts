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
      const values = reflectionsOfKind(
        pkage,
        ReflectionKind.Variable
      ) as S.DeclarationReflection[];
      return values
        .map((avalue) => {
          
          const dir = [outputDirectory, pkage.name ?? "", "values"];
          return [
            new File({
              path: [...dir, `${avalue.name}.md`],
              content: text`
                # Value \`${avalue.name}\`
                ${sources(avalue)}

                ${comment(avalue.comment)}
                `,
            }),
            // new JSONFile({
            //   path: [...dir, `${avalue.name}.json`],
            //   content: avalue,
            // }),
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
