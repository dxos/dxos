import { ReflectionKind, JSONOutput as S } from 'typedoc';
import { Input } from '../..';
import { TemplateFunction, text, File } from '@dxos/plate';
import { Stringifier, packagesInProject, reflectionsOfKind } from "../../util.t";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  return packages
    .map((pkage) => {
      const classes = reflectionsOfKind(pkage, ReflectionKind.Class) as S.ContainerReflection[];
      return classes
        .map((aclass) => {
          const constructors = reflectionsOfKind(aclass, ReflectionKind.Constructor);
          const properties = reflectionsOfKind(aclass, ReflectionKind.Property, ReflectionKind.Accessor).filter(
            (r) => !r.flags.isPrivate
          );
          const functions = reflectionsOfKind(aclass, ReflectionKind.Method, ReflectionKind.Function).filter(
            (r) => !r.flags.isPrivate
          );
          const classesDir = [outputDirectory, pkage.name ?? '', 'classes'];
          return [
            new File({
              path: [...classesDir, `${aclass.name}.md`],
              content: text`
                # Class \`${aclass.name}\`
                ${stringifier.sources(aclass)}

                ${stringifier.comment(aclass.comment)}

                ## Constructors
                ${constructors.map((c) => stringifier.method(c))}

                ## Properties
                ${properties.map((p) => stringifier.property(p))}

                ## Methods
                ${functions.map((f) => stringifier.method(f))}
                `
            })
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
