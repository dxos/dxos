import { ReflectionKind, JSONOutput as S } from 'typedoc';
import {
  Input,
  TemplateFunction,
  text,
  File,
  packagesInProject,
  reflectionsOfKind,
  Stringifier
} from '../..';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const stringifier = new Stringifier(input);
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const types = reflectionsOfKind(
        pkage,
        ReflectionKind.TypeAlias
      ) as S.DeclarationReflection[];
      return types
        .map((atype) => {
          const dir = [outputDirectory, pkage.name ?? '', 'types'];
          return [
            new File({
              path: [...dir, `${atype.name}.md`],
              content: text`
                # Type alias \`${atype.name}\`
                ${stringifier.sources(atype)}

                ${stringifier.comment(atype.comment)}

                \`\`\`ts
                type ${atype.name} = ${stringifier.types.type(atype.type!)}
                \`\`\`
                `
            })
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
