import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { TemplateFunction, text, File } from '@dxos/plate';
import { packagesInProject, Stringifier, reflectionsOfKind } from '../util.t';
import { Input } from '../index';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  if (typeof outputDirectory == 'undefined') throw new Error('invalid output directory');
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  return packages
    .filter((p) => p?.name)
    .map((pkage) => {
      const funcs = reflectionsOfKind(pkage, ReflectionKind.Function) as S.DeclarationReflection[];
      const dir = [outputDirectory, pkage.name];
      return new File({
        path: [...dir, `functions.md`],
        content: text`
        ---
        title: Functions
        ---
        # Functions
        ${funcs.map((func) => stringifier.method(func))}
        `
      });
    });
};

export default template;
