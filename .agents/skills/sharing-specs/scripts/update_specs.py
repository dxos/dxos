#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#
"""Spec-only update of a packaged spec page: no storybook build, no bundle upload.

Usage:
  python3 update_specs.py <packaged dir> <files.json> [repo-relative spec path ...]

Copies every spec the page ships (or only the named ones) from the working tree into <packaged dir>/specs/
where its text changed, and writes the Artifact `files` map of just those files. Publish it to the same
artifact with `root` = <packaged dir>; the publisher keeps every file left out, so the bundle stays as it is.
"""

import json
import sys

import specs

if len(sys.argv) < 3:
    raise SystemExit(__doc__)
out, files_out, only = sys.argv[1], sys.argv[2], set(sys.argv[3:]) or None
manifest = specs.read_manifest(out)
if not manifest:
    raise SystemExit(f'{out}: no {specs.MANIFEST}; this page was built before specs shipped as files, so rebuild it')
unknown = (only or set()) - set(manifest)
if unknown:
    raise SystemExit(f'not shipped by this page (rebuild to add a spec): {", ".join(sorted(unknown))}')
changed = specs.refresh(out, only)
json.dump({served: specs.file_entry(served) for served in changed}, open(files_out, 'w'), indent=2)
print('\n'.join(changed) if changed else 'no spec changed')
print(f'wrote {len(changed)} files to {files_out}')
