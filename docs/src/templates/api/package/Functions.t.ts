import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { TemplateFunction, text, File } from '@dxos/plate';
import { Stringifier } from '../lib/Stringifier';
import { packagesInProject, reflectionsOfKind } from '../lib/utils';
import { Input } from '../index';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  return packages.map((pkage) => {
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
