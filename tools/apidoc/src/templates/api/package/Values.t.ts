import path from 'node:path';
import { plate } from '@dxos/plate';
import template from '../template.t';
import { ReflectionKind, JSONOutput as Schema } from 'typedoc';
import { packagesInProject, reflectionsOfKind, Stringifier } from '../util.t/index.js';

export default template.define.group(({ input }) => {
  const packages = packagesInProject(input!);
  const stringifier = new Stringifier(input!);
  return packages
    .filter((p) => p?.name)
    .map((pkage) => {
      const values = reflectionsOfKind(pkage, ReflectionKind.Variable) as Schema.DeclarationReflection[];

      return template.define.text({
        path: path.join(pkage.name, 'values.md'),
        content: plate`
        ---
        title: Values
        ---
        # Values 
        
        ${values.map(
          (avalue) => plate`
          ### [\`${avalue.name}\`](${avalue.sources?.[0]?.url})
          Type: ${stringifier.md.stringify(avalue.type!)}
          
          ${stringifier.comment(avalue.comment)}
          `,
        )}
        `,
      });
    })
    .flat();
});
