import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { TemplateFunction, text, File } from '@dxos/plate';
import { Input } from '../..';
import { packagesInProject, reflectionsOfKind } from '../../lib/utils';
import { Stringifier } from '../../lib/Stringifier';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const stringifier = new Stringifier(input);
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const types = reflectionsOfKind(pkage, ReflectionKind.TypeAlias) as S.DeclarationReflection[];
      return types
        .map((atype) => {
          const dir = [outputDirectory, pkage.name ?? '', 'types'];
          return [
            new File({
              path: [...dir, `${atype.name}.md`],
              content: text`
                # Type \`${atype.name}\`
                ${stringifier.sources(atype)}

                ${stringifier.comment(atype.comment)}

                \`\`\`ts
                type ${atype.name} = ${stringifier.txt.type(atype.type!)}
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
