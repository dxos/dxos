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
  method
} from "../..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const funcs = reflectionsOfKind(
        pkage,
        ReflectionKind.Function
      ) as S.DeclarationReflection[];
      return funcs
        .map((afunc) => {
          
          const dir = [outputDirectory, pkage.name ?? "", "functions"];
          return [
            new File({
              path: [...dir, `${afunc.name}.md`],
              content: text`
                # Function \`${afunc.name}\`
                ${sources(afunc)}

                ${comment(afunc.comment)}

                ${method(afunc)}
                `,
            }),
            // new JSONFile({
            //   path: [...dir, `${afunc.name}.json`],
            //   content: afunc,
            // }),
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
