import path from 'path';
import { TemplateFunction, File } from '@dxos/plate';
import { Input } from '../index';
import { packagesInProject } from '../lib/utils';

const template: TemplateFunction<Input> = ({ input, outputDirectory }) => {
  const modules = packagesInProject(input);
  return modules
    .map((module) => {
      const source = module.sources?.[0].fileName;
      const packageReadme = source?.replace('src/index.ts', 'README.md');
      return packageReadme
        ? new File({
            path: [outputDirectory, module.name, 'README.md'],
            copyFrom: path.resolve(process.cwd(), '..', packageReadme)
          })
        : null!;
    })
    .filter(Boolean);
};

export default template;
