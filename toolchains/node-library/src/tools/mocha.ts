import { execTool } from "./common";

export function execMocha (additionalArgs: string[] = []) {
  execTool('mocha', ['-r', 'ts-node/register/transpile-only', '--exit', '-t', '15000', 'src/**/*.test.ts', ...additionalArgs], {
    stdio: ['inherit', 'inherit', process.stdout] // Redirect stderr > stdout.
  });
}
