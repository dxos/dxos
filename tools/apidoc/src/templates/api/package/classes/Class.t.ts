import path from 'node:path';
import { ReflectionKind, JSONOutput as S } from 'typedoc';
import template from '../../template.t.js';
import { Stringifier, packagesInProject, reflectionsOfKind } from '../../util.t/index.js';

export default template.define.group(({ input }) => {
  const packages = packagesInProject(input! as any);
  const stringifier = new Stringifier(input! as any);
  return packages
    .map((pkage) => {
      const classes = reflectionsOfKind(pkage, ReflectionKind.Class) as S.DeclarationReflection[];
      return classes
        .map((aclass) => {
          return [
            template.define.text({
              path: path.join(pkage.name, 'classes', `${aclass.name}.md`),
              content: stringifier.class(aclass),
            }),
          ];
        })
        .flat();
    })
    .flat();
});
