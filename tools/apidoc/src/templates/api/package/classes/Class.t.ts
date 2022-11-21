import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { Input } from '../../index.js';
import { TemplateFunction, text, File } from '@dxos/plate';
import { Stringifier, packagesInProject, reflectionsOfKind } from '../../util.t/index.js';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  return packages
    .map((pkage) => {
      const classes = reflectionsOfKind(pkage, ReflectionKind.Class) as S.ContainerReflection[];
      return classes
        .map((aclass) => {
          const classesDir = [outputDirectory, pkage.name ?? '', 'classes'];
          return [
            new File({
              path: [...classesDir, `${aclass.name}.md`],
              content: stringifier.class(aclass)
            })
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
