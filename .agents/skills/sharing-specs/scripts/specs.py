#
# Copyright 2026 DXOS.org
#
"""The specs a packaged page fetches at runtime: `specs/manifest.json` and the files it lists.

A static build writes them (see `tools/storybook-react/.storybook/spec-files.ts`); these helpers copy
newer text in from the working tree, so a spec edit reaches the page without a storybook rebuild.
"""

import json
import os
import subprocess

MANIFEST = 'specs/manifest.json'
KEY_PREFIX = 'github:dxos/dxos/'
# The publisher infers no type for `.mdl` and accepts no parameters; `Response.text()` decodes UTF-8 regardless.
CONTENT_TYPE = 'text/plain'


def repo_root():
    here = os.path.dirname(os.path.realpath(__file__))
    return subprocess.run(['git', '-C', here, 'rev-parse', '--show-toplevel'], check=True, capture_output=True,
                          text=True).stdout.strip()


def read_manifest(out):
    """Maps each spec's repo path to its served path under `out`; empty for a build with no `?spec` imports."""
    path = os.path.join(out, MANIFEST)
    if not os.path.exists(path):
        return {}
    return {key.removeprefix(KEY_PREFIX): served for key, served in json.load(open(path)).items()}


def refresh(out, only=None):
    """Copies each listed spec from the working tree into `out` where it differs; returns the served paths it changed."""
    repo, changed = repo_root(), []
    for path, served in read_manifest(out).items():
        if only is not None and path not in only:
            continue
        text = open(os.path.join(repo, path), 'rb').read()
        target = os.path.join(out, served)
        if os.path.exists(target) and open(target, 'rb').read() == text:
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        open(target, 'wb').write(text)
        changed.append(served)
    return changed


def file_entry(served):
    return {'from': served, 'contentType': CONTENT_TYPE}
