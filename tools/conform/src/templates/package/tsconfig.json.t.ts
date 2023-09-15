import path from 'path';
import template from './template.t';

export default template.define.text({
  content: ({ outputDirectory }) => {
    const rootTsConfig = path.resolve(__dirname, '../../../../../../tsconfig.json');
    const tsconfigJson = {
      extends: path.relative(outputDirectory, rootTsConfig),
      compilerOptions: {
        lib: ['DOM', 'ESNext'],
        outDir: 'dist',
        types: ['node'],
        emitDeclarationOnly: false
      },
      include: ['src']
    };
    return JSON.stringify(tsconfigJson, null, 2);
  }
});
