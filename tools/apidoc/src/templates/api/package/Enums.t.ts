import path from 'node:path';
import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { plate } from '@dxos/plate';
import template from '../template.t.js';
import { packagesInProject, reflectionsOfKind, Stringifier } from '../util.t/index.js';

export default template.define.group(({ input }) => {
  const packages = packagesInProject(input! as any);
  const stringifier = new Stringifier(input! as any);

  return packages.map((pkage) => {
    const enums = reflectionsOfKind(pkage, ReflectionKind.Enum) as S.DeclarationReflection[];
    return template.define.text({
      path: path.join(pkage.name ?? '', 'enums.md'),
      content: !!enums?.length && plate`
        ---
        title: Enumerations
        ---
        # Enumerations
        ${enums.map(
          (aenum) => plate`
          ### [\`${aenum.name}\`](${aenum.sources?.[0]?.url})

          ${stringifier.comment(aenum.comment)}

          Values:
          ${reflectionsOfKind(aenum, ReflectionKind.EnumMember).map(
            (member) => plate`
            - \`${member.name}\` ${stringifier.comment(member.comment)}
            `
          )}
          `
        )}
        `
    });
  });
});