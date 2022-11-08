import { ReflectionKind, JSONOutput as Schema } from 'typedoc';
import { TemplateFunction, text, File } from '@dxos/plate';
import { Input } from '..';
import { packagesInProject, reflectionsOfKind } from '../lib/utils';
import { Stringifier } from '../lib/Stringifier';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  return packages
    .map((pkage) => {
      const values = reflectionsOfKind(pkage, ReflectionKind.Variable) as Schema.DeclarationReflection[];

      const dir = [outputDirectory, pkage.name];

      return new File({
        path: [...dir, 'values.md'],
        content: text`
        ---
        title: Values
        ---
        # Values 
        
        ${values.map(
          (avalue) => text`
          ### [\`${avalue.name}\`](${avalue.sources?.[0]?.url})
          Type: ${stringifier.md.stringify(avalue.type!)}
          
          ${stringifier.comment(avalue.comment)}
          `
        )}
        `
      });
    })
    .flat();
};

export default template;
