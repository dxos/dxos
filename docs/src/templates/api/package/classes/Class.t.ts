import { ReflectionKind, JSONOutput as S } from "typedoc";
import {
  method,
  comment,
  sources,
  Input,
  TemplateFunction,
  text,
  File,
  JSONFile,
  packagesInProject,
  reflectionsOfKind,
  property,
} from "../..";

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  return packages
    .map((pkage) => {
      const classes = reflectionsOfKind(
        pkage,
        ReflectionKind.Class
      ) as S.ContainerReflection[];
      return classes
        .map((aclass) => {
          const constructors = reflectionsOfKind(
            aclass,
            ReflectionKind.Constructor
          );
          const properties = reflectionsOfKind(
            aclass,
            ReflectionKind.Property,
            ReflectionKind.Accessor
          ).filter((r) => !r.flags.isPrivate);
          const functions = reflectionsOfKind(
            aclass,
            ReflectionKind.Method,
            ReflectionKind.Function
          ).filter((r) => !r.flags.isPrivate);
          const sourceFileName = aclass.sources?.[0]?.fileName;
          const classesDir = [outputDirectory, pkage.name ?? "", "classes"];
          return [
            new File({
              path: [...classesDir, `${aclass.name}.md`],
              content: text`
                # Class \`${aclass.name}\`
                ${sources(aclass)}

                ${comment(aclass.comment)}

                ## Constructors
                ${constructors.map(method)}

                ## Properties
                ${properties.map(property)}

                ## Functions
                ${functions.map(method)}
                `,
            }),
            // new JSONFile({
            //   path: [...classesDir, `${aclass.name}.json`],
            //   content: aclass,
            // }),
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
