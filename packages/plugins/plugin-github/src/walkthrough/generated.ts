//
// Copyright 2026 DXOS.org
//

/**
 * Files a reviewer does not read, and a walkthrough should not spend prose or a fence on: machine
 * output, vendored blobs, and anything whose diff is a consequence of another file in the same
 * change.
 *
 * Detection is by path and by patch shape rather than by a `.gitattributes` lookup, because the
 * walkthrough only ever has the patch.
 */

/** Lockfiles: the largest hunk in most pull requests and the one nobody reads. */
const LOCKFILES = [
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
  'npm-shrinkwrap.json',
  'Cargo.lock',
  'poetry.lock',
  'composer.lock',
  'Gemfile.lock',
  'go.sum',
  'flake.lock',
  'uv.lock',
];

/** Directories whose contents are built, vendored or cached rather than written. */
const GENERATED_DIRECTORIES = /(^|\/)(dist|build|out|coverage|node_modules|vendor|__snapshots__|\.turbo)\//;

/** Suffixes that are compiled, minified, generated from a schema, or not text at all. */
const GENERATED_SUFFIX =
  /(\.min\.(js|css)|\.map|\.snap|\.d\.ts|[._-]pb\.(ts|js)|\.pb\.go|_pb2\.py|\.gen\.(ts|js|go)|\.generated\.[a-z]+)$/i;

/** Binary by extension. A patch shows these as "Binary files … differ", with nothing to read. */
const BINARY_SUFFIX =
  /\.(png|jpe?g|gif|webp|avif|ico|icns|bmp|tiff?|svgz|pdf|woff2?|ttf|otf|eot|zip|gz|tgz|bz2|xz|7z|rar|wasm|so|dylib|dll|exe|bin|dat|db|sqlite3?|mp[34]|mov|mp4|webm|wav|ogg|jar|class|pyc|node)$/i;

/**
 * Whether a path is machine-written or unreadable.
 *
 * `.changeset/` entries count: the changeset is a consequence of the change the walkthrough already
 * describes, and a section about it tells the reader nothing the rest of the document did not.
 */
export const isGeneratedPath = (path: string): boolean => {
  const name = path.split('/').pop() ?? path;
  return (
    LOCKFILES.includes(name) ||
    GENERATED_DIRECTORIES.test(path) ||
    GENERATED_SUFFIX.test(path) ||
    BINARY_SUFFIX.test(path) ||
    path.startsWith('.changeset/') ||
    path.includes('/.changeset/')
  );
};

/** A file git could not diff as text, whatever its extension says. */
export const isBinaryPatch = (preamble: readonly string[]): boolean =>
  preamble.some((line) => line.startsWith('Binary files ') || line.startsWith('GIT binary patch'));

/**
 * Whether this file is one the walkthrough should leave alone.
 *
 * A hunk count of zero is NOT generated on its own: a rename or a mode change is still a change a
 * reviewer has to know about, and {@link fillWalkthrough} reports it separately.
 */
export const isGeneratedFile = (file: { path: string; preamble: readonly string[] }): boolean =>
  isGeneratedPath(file.path) || isBinaryPatch(file.preamble);
