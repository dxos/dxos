import path from 'path';
import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { plate } from '@dxos/plate';
import { packagesInProject, Stringifier, reflectionsOfKind } from '../util.t/index.js';
import template from '../template.t.js';

export default template.define.group(({ input }) => {
  const packages = packagesInProject(input! as any);
  const stringifier = new Stringifier(input! as any);
  return packages
    .filter((p) => p?.name)
    .map((pkage) => {
      const funcs = reflectionsOfKind(pkage, ReflectionKind.Function) as S.DeclarationReflection[];
      return template.define.text({
        path: path.join( pkage.name, 'functions.md'),
        content: !!funcs?.length && plate`
        ---
        title: Functions
        ---
        # Functions
        ${funcs.map((func) => stringifier.method(func))}
        `,
      });
    });
});
