import path from 'node:path';
import { ReflectionKind, JSONOutput as S } from 'typedoc';
import template from '../../template.t.js';
import { packagesInProject, reflectionsOfKind, Stringifier } from '../../util.t/index.js';

export default template.define.group(({ input }) => {
  const stringifier = new Stringifier(input! as any);
  const packages = packagesInProject(input! as any);
  return packages
    .map((pkage) => {
      const types = reflectionsOfKind(pkage, ReflectionKind.TypeAlias) as S.DeclarationReflection[];
      return types
        .map((atype) => {
          return [
            template.define.text({
              path: path.join(pkage.name, 'types', `${atype.name}.md`),
              content: stringifier.type(atype),
            }),
          ];
        })
        .flat();
    })
    .flat();
});
