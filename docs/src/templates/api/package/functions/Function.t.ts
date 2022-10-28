import { ReflectionKind, JSONOutput as S } from 'typedoc';
import {
  Input,
  TemplateFunction,
  text,
  Stringifier,
  File,
  packagesInProject,
  reflectionsOfKind
} from '../..';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const packages = packagesInProject(input);
  const stringifier = new Stringifier(input);
  return packages
    .map((pkage) => {
      const funcs = reflectionsOfKind(
        pkage,
        ReflectionKind.Function
      ) as S.DeclarationReflection[];
      return funcs
        .map((afunc) => {
          const dir = [outputDirectory, pkage.name ?? '', 'functions'];
          return [
            new File({
              path: [...dir, `${afunc.name}.md`],
              content: text`
                # Function \`${afunc.name}\`
                ${stringifier.sources(afunc)}

                ${stringifier.comment(afunc.comment)}

                ${stringifier.method(afunc)}
                `
            })
          ];
        })
        .flat();
    })
    .flat();
};

export default template;
