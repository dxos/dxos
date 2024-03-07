import path from 'node:path';
import template from '../template.t.js';
import { packagesInProject } from '../util.t/index.js';
import { ContainerReflection, JSONOutput as S } from 'typedoc'

export default template.define.group(({ input }) => {
  const { packagesPath } = input!;
  const modules = packagesInProject(input! as S.ProjectReflection) as S.DeclarationReflection[];
  console.log('found modules:', modules.length);
  return modules
    .map((module) => {
      const readme = module.readme?.reduce((acc, r) => acc + '\n' + r.text, '');
      return readme
        ? template.define.text({
            path: path.join(module.name, 'README.md'),
            content: readme
            // copyOf: path.resolve(packagesPath!.replace(/packages\/?$/, ''), packageReadme),
          })
        : null!;
    })
    .filter(Boolean);
});
