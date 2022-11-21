import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { TemplateFunction, File } from '@dxos/plate';
import { Input } from '../../index.js';
import { packagesInProject, reflectionsOfKind, Stringifier } from '../../util.t/index.js';

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
              content: stringifier.type(atype)
            })
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
