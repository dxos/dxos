
import solidPlugin from '@opentui/solid/bun-plugin';

await Bun.build({
  entrypoints: ['./src/bin.ts'],
  target: 'bun',
  outdir: './dist',
  plugins: [solidPlugin],
  compile: {
    target: 'bun-darwin-arm64',
    outfile: 'app-macos',
  },
});
