import path from 'path';
import template from './template.t';

export default template.define.text({
  content: ({ outputDirectory }) => {
    const relative = (...s: string[]) => path.relative(process.cwd(), path.resolve(outputDirectory, ...s));
    const projectJson = {
      sourceRoot: relative('src'),
      projectType: 'library',
      targets: {
        build: {
          executor: '@nx/js:tsc',
          options: {
            main: relative('src', 'index.ts'),
            outputPath: relative('dist'),
            tsConfig: relative('tsconfig.json')
          },
          outputs: ['{options.outputPath}']
        },
        lint: {
          executor: '@nx/linter:eslint',
          options: {
            format: 'unix',
            lintFilePatterns: [relative('src/**/*.{ts,js,tsx,jsx}')]
          },
          outputs: ['{options.outputFile}']
        }
      }
    };
    return JSON.stringify(projectJson, null, 2);
  }
});
