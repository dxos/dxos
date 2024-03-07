import path from 'node:path';
import { ReflectionKind, JSONOutput as S } from 'typedoc';
import template from '../../template.t.js';
import { Stringifier, reflectionsOfKind, packagesInProject } from '../../util.t/index.js';

export default template.define.group(({ input }) => {
  const packages = packagesInProject(input! as any);
  return packages
    .map((pkage) => {
      const ifaces = reflectionsOfKind(pkage, ReflectionKind.Interface) as S.DeclarationReflection[];
      const stringifier = new Stringifier(input! as any);
      return ifaces
        .map((iface) => {
          return [
            template.define.text({
              path: path.join(pkage.name, 'interfaces', `${iface.name}.md`),
              content: stringifier.interface(iface)
            })
          ];
        })
        .flat();
    })
    .flat();
});