import { PackageJson } from 'types-package-json';
import template from './template.t';

export default template.define.text({
  content: ({ input }) => {
    const { name } = input;
    const packageJson: PackageJson = {
      name,
      version: '0.1.0',
      main: 'dist/src/index.js',
      scripts: {
        build: 'tsc'
      },
      devDependencies: {
        typescript: '^4.8.4'
      }
    };
    return JSON.stringify(packageJson, null, 2);
  }
});
