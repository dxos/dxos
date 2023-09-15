import path from 'node:path';
import template from '../template.t.js';
import { packagesInProject } from '../util.t/index.js';

export default template.define.group(({ input }) => {
  const { packagesPath } = input!;
  const modules = packagesInProject(input! as any);
  return modules
    .map((module) => {
      const source = module.sources?.[0].fileName;
      const packageReadme = source?.replace('src/index.ts', 'README.md');
      return packageReadme
        ? template.define.text({
            path: path.join(module.name, 'README.md'),
            copyOf: path.resolve(packagesPath!.replace(/packages\/?$/, ''), packageReadme),
          })
        : null!;
    })
    .filter(Boolean);
});
