import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { Input, TemplateFunction, text, File } from '..';

import { packagesInProject, reflectionsOfKind } from '..';
import { Stringifier } from '..';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  
  return packages.map((pkage) => {
    const enums = reflectionsOfKind(
      pkage,
      ReflectionKind.Enum
    ) as S.ContainerReflection[];
    return new File({
      path: [outputDirectory, pkage.name ?? '', 'enums.md'],
      content: text`
        ---
        title: Enumerations
        ---
        # Enumerations
        ${enums.map(
          (aenum) => text`
          ## ${aenum.name}
          ${stringifier.sources(aenum)}
          ${stringifier.comment(aenum.comment)}

          ### Values:
          ${reflectionsOfKind(aenum, ReflectionKind.EnumMember).map(
            (member) => text`
            #### \`${member.name}\`
            ${stringifier.comment(member.comment)}
            `
          )}
          `
        )}
        `
    });
  });
};

export default template;
