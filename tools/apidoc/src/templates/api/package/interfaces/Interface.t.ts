import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { Input } from '../../config.t.js';
import { Stringifier, reflectionsOfKind, packagesInProject } from '../../util.t/index.js';

import { TemplateFunction, text, File } from '@dxos/plate';
const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const ifaces = reflectionsOfKind(pkage, ReflectionKind.Interface) as S.ContainerReflection[];
      const stringifier = new Stringifier(input);
      const interfacesDir = [outputDirectory, pkage.name ?? '', 'interfaces'];
      return ifaces
        .map((iface) => {
          const sourceFileName = iface.sources?.[0]?.fileName;
          const properties = reflectionsOfKind(iface, ReflectionKind.Property);
          return [
            new File({
              path: [...interfacesDir, `${iface.name}.md`],
              content: text`
                # Interface \`${iface.name}\`
                > Declared in [\`${sourceFileName}\`]()

                ${stringifier.comment(iface.comment)}
                ## Properties
                ${properties.map((p) => stringifier.property(p))}
              `
            })
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
