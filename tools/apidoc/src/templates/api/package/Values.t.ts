import path from 'node:path';
import { plate } from '@dxos/plate';
import template from '../template.t.js';
import { ReflectionKind, JSONOutput as Schema } from 'typedoc';
import { packagesInProject, reflectionsOfKind, Stringifier } from '../util.t/index.js';

export default template.define.group(({ input }) => {
  const packages = packagesInProject(input! as any);
  const stringifier = new Stringifier(input! as any);
  return packages
    .filter((p) => p?.name)
    .map((pkage) => {
      const values = reflectionsOfKind(pkage, ReflectionKind.Variable) as Schema.DeclarationReflection[];

      return template.define.text({
        path: path.join(pkage.name, 'values.md'),
        content: !!values?.length && plate`
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
