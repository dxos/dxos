import { globby } from 'globby';
import madge from 'madge';
const globs = process.argv.slice(2);
const files = await globby(globs, { ignore: ['**/node_modules/**','**/dist/**','**/gen/**'], gitignore: true });
const res = await madge(files, { detectiveOptions: { ts: { skipTypeImports: true } } });
const c = res.circular();
console.log(files.length, 'files,', c.length, 'cycles');
for (const x of c.slice(0, 40)) console.log(' ', x.join(' -> '));
