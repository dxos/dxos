#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#
"""Turn a static storybook build into one Claude Artifact page with a tab per story.

Usage:
  python3 package.py <storybook build dir> <out dir> --title "GitHub Sync Specs" \
    --tab "1 · Polling sync=plugins-plugin-code-components-specchangelog--git-hub-sync" \
    --tab "2 · File sync=plugins-plugin-code-components-specchangelog--git-hub-file-sync"

  python3 package.py <storybook build dir> <out dir> --title "Feed Options Specs" --base origin/main \
    --spec "1 · Feed object=packages/core/echo/echo/SPEC.mdl" \
    --spec "2 · Feed store=packages/core/echo/feed/SPEC.mdl"

`--tab` shows a story by id; `--spec` shows any spec through the generic `AnySpec` story, so it needs no story of
its own and no rebuild (a cached build works: `storybook-cache.ts pull`). `--base <ref>` opens every `--spec` tab in
diff mode against the spec's text at that git ref (empty when the spec is new). The two forms mix, in argv order.

Writes <out dir>/page.html plus the build's files, adjusted for the artifact publisher:
  - the page selects the first story by rewriting its own query (an artifact link carries no query),
  - tabs switch stories through Storybook's preview channel (links cannot leave the artifact frame),
  - <html>/<head>/<body> wrappers are removed (the publisher adds its own skeleton),
  - pinch-zoom is re-enabled (the theme's root `touch-action: pan-x pan-y` blocks it on touch devices),
  - control bytes and U+FFFD in JS become escapes, and the icon sprite loses its DOCTYPE
    (the publisher rejects both),
  - GitHub avatars are downloaded into avatars/ and the bundle points at them (no external images),
  - specs the stories import with `?spec` are refreshed in specs/ from the working tree (stories fetch them
    at runtime, so a spec edit needs no rebuild).
"""

import argparse
import glob
import html
import json
import os
import re
import shutil
import subprocess
import urllib.request

import specs

parser = argparse.ArgumentParser()
parser.add_argument('build')
parser.add_argument('out')
parser.add_argument('--title', required=True)
# Both forms append to one list, so tabs keep their argv order.
parser.add_argument('--tab', dest='tabs', action='append', type=lambda value: ('story', value), default=[],
                    help='"Label=story-id"')
parser.add_argument('--spec', dest='tabs', action='append', type=lambda value: ('spec', value),
                    help='"Label=repo path of a .mdl", rendered by the AnySpec story')
parser.add_argument('--base', help='git ref every --spec tab is diffed against')
args = parser.parse_args()
if not args.tabs:
    parser.error('pass at least one --tab or --spec')

ANY_SPEC_STORY = 'plugins-plugin-code-containers-specarticle--any-spec'
# (label, story id, spec path or None)
tabs = []
for kind, value in args.tabs:
    label, target = value.split('=', 1)
    tabs.append((label, ANY_SPEC_STORY, target) if kind == 'spec' else (label, target, None))


def review_of(path):
    """The spec's review (`<SPEC>.review.mdl` beside it), shipped with its tab when one exists."""
    review = re.sub(r'\.mdl$', '.review.mdl', path)
    return review if os.path.exists(os.path.join(specs.repo_root(), review)) else None


def spec_tab(path):
    """The value the AnySpec story reads from `globalThis.__DX_SPEC_TAB__`."""
    if path is None:
        return None
    return {'path': path, 'base': args.base is not None, 'review': review_of(path) is not None}

build, out = os.path.realpath(args.build), os.path.realpath(args.out)
# The output directory is replaced by a copy of the build, so neither may contain the other.
if os.path.commonpath([build, out]) in (build, out):
    raise SystemExit(f'{args.out}: output and build directories overlap; choose another')
shutil.rmtree(args.out, ignore_errors=True)
shutil.copytree(args.build, args.out)
os.chdir(args.out)

page = open('iframe.html').read()
page = re.sub(r'(?is)<title>.*?</title>', '', page)

head = f"""<title>{html.escape(args.title)}</title>
<script>
  // An artifact link carries no query, so the page selects its first story before Storybook reads it.
  (function () {{
    window.__DX_SPEC_TAB__ = {json.dumps(spec_tab(tabs[0][2]))};
    var query = '?id=' + {json.dumps(tabs[0][1])} + '&viewMode=story';
    if (location.search !== query) {{
      try {{ history.replaceState(null, '', location.pathname + query + location.hash); }} catch (error) {{}}
    }}
  }})();
</script>
"""

buttons = '\n'.join(
    f'  <button role="tab" data-story="{html.escape(story)}" data-spec="{html.escape(json.dumps(spec_tab(path)))}"'
    f'>{html.escape(label)}</button>'
    for label, story, path in tabs
)
tab_bar = f"""
<style>
  /* The theme's layered `:root {{ touch-action: pan-x pan-y }}` suits the app shell but leaves a spec page unzoomable
     on iPad; an unlayered rule outranks it. */
  :root {{ touch-action: manipulation; }}
  #spec-tabs {{ position: fixed; inset: 0 0 auto; z-index: 1000; display: flex; gap: 2px; height: 40px; align-items: stretch;
    padding: 0 max(12px, env(safe-area-inset-right, 0px)) 0 max(12px, env(safe-area-inset-left, 0px));
    background: #111318; border-bottom: 1px solid #2a2f3a; font: 500 13px/1 system-ui, sans-serif; overflow-x: auto; }}
  #spec-tabs button {{ all: unset; cursor: pointer; padding: 0 14px; color: #9aa3b2; border-bottom: 2px solid transparent; white-space: nowrap; }}
  #spec-tabs button:hover {{ color: #e5e7eb; }}
  #spec-tabs button:focus-visible {{ outline: 2px solid #60a5fa; outline-offset: -2px; }}
  #spec-tabs button[aria-selected="true"] {{ color: #f3f4f6; border-bottom-color: #60a5fa; }}
  /* Full-screen stories render into a fixed, inset-0 wrapper — directly or under `display: contents` decorators,
     which padding cannot reach — so the outermost one is moved below the tab bar rather than padded. */
  #storybook-root .fixed.inset-0:not(.fixed.inset-0 .fixed.inset-0) {{ top: 40px !important; }}
  #storybook-root {{ padding-top: 40px; box-sizing: border-box; }}
  #storybook-root:has(.fixed.inset-0) {{ padding-top: 0; }}
</style>
<nav id="spec-tabs" role="tablist" aria-label="Stories">
{buttons}
</nav>
<script>
  // Links cannot leave the artifact frame, so tabs ask Storybook's preview to swap the story in place.
  (function () {{
    var tabs = document.querySelectorAll('#spec-tabs button');
    // Several --spec tabs share the AnySpec story, so a tab is marked by itself rather than by its story id.
    var mark = function (selected) {{
      tabs.forEach(function (tab) {{ tab.setAttribute('aria-selected', String(tab === selected)); }});
    }};
    mark(tabs[0]);
    var current = tabs[0].dataset.story;
    tabs.forEach(function (tab) {{
      tab.addEventListener('click', function () {{
        var preview = window.__STORYBOOK_PREVIEW__;
        if (!preview || !preview.channel) {{ return; }}
        window.__DX_SPEC_TAB__ = JSON.parse(tab.dataset.spec);
        // The same story remounts, which re-reads the selected spec and refetches it, so a spec-only republish shows
        // without a reload.
        if (tab.dataset.story === current) {{
          preview.channel.emit('forceRemount', {{ storyId: current }});
        }} else {{
          preview.channel.emit('setCurrentStory', {{ storyId: tab.dataset.story, viewMode: 'story' }});
          current = tab.dataset.story;
        }}
        mark(tab);
      }});
    }});
  }})();
</script>
"""

start = page.index('<head>') + len('<head>')
page = page[:start] + '\n' + head + page[start:]
end = page.rindex('</body>')
page = page[:end] + tab_bar + page[end:]
page = re.sub(r'(?is)<!doctype[^>]*>', '', page)
page = re.sub(r'(?is)</?html[^>]*>', '', page)
page = re.sub(r'(?is)</?head[^>]*>', '', page)
page = re.sub(r'(?is)<body([^>]*)>', r'<div id="sb-body"\1>', page, count=1)
page = page.replace('</body>', '</div>')
open('page.html', 'w').write(page.strip() + '\n')

for script in glob.glob('**/*.js', recursive=True):
    data = open(script, 'rb').read()
    # Vertical tab and form feed are JS whitespace, so escaping them could change code outside literals.
    if re.search(rb'[\x0b\x0c]', data):
        raise SystemExit(f'{script}: contains VT/FF; escape it by hand after checking where it occurs')
    data = re.sub(rb'[\x00-\x08\x0e-\x1f]', lambda match: ('\\x%02x' % match.group()[0]).encode(), data)
    data = data.replace('�'.encode(), b'\\uFFFD')
    open(script, 'wb').write(data)

# The icon loader fetches `/icons.svg`, then `/phosphor/…` per missing icon. Root-relative paths miss the artifact's
# files, so they become page-relative, and every icon the bundle names joins the sprite so none needs a per-icon fetch.
ICON_ROOTS = {rb'`/icons.svg`': rb'`icons.svg`', rb'`/phosphor`': rb'`phosphor`', rb'`/px-icons`': rb'`px-icons`'}
ICON_NAME = rb'ph--([a-z0-9-]+?)--(regular|bold|fill|duotone|light|thin)\b'
icon_names = set()
for script in glob.glob('**/*.js', recursive=True):
    data = open(script, 'rb').read()
    icon_names.update(re.findall(ICON_NAME, data))
    for old, new in ICON_ROOTS.items():
        data = data.replace(old, new)
    open(script, 'wb').write(data)
if os.path.exists('icons.svg'):
    sprite = open('icons.svg', encoding='utf-8').read()
    phosphor = glob.glob(os.path.join(specs.repo_root(), 'node_modules/.pnpm/@phosphor-icons+core@*/node_modules/'
                                      '@phosphor-icons/core/assets'))
    added, unknown = 0, []
    for name, variant in sorted((name.decode(), variant.decode()) for name, variant in icon_names):
        icon_id = f'ph--{name}--{variant}'
        if f'id="{icon_id}"' in sprite:
            continue
        source = phosphor and os.path.join(phosphor[0], variant, f'{name}.svg' if variant == 'regular' else f'{name}-{variant}.svg')
        if not source or not os.path.exists(source):
            unknown.append(icon_id)
            continue
        body = re.search(r'(?s)<svg[^>]*>(.*)</svg>', open(source, encoding='utf-8').read()).group(1)
        end = sprite.rindex('</svg>')
        sprite = f'{sprite[:end]}<symbol viewBox="0 0 256 256" id="{icon_id}" fill="currentColor">{body}</symbol>{sprite[end:]}'
        added += 1
    open('icons.svg', 'w', encoding='utf-8').write(sprite)
    print(f'icons: {added} added to the sprite' + (f'; not found: {", ".join(unknown)}' if unknown else ''))

for sprite in glob.glob('**/*.svg', recursive=True):
    text = open(sprite, encoding='utf-8', errors='surrogateescape').read()
    open(sprite, 'w', encoding='utf-8', errors='surrogateescape').write(re.sub(r'<!DOCTYPE[^>]*>', '', text, count=1))

# --spec tabs join the manifest, so `refresh` copies them now and `update_specs.py` republishes their edits.
spec_paths = [path for _, _, path in tabs if path is not None]
specs.add_to_manifest('.', spec_paths + [review_of(path) for path in spec_paths if review_of(path)])
for path in spec_paths if args.base else []:
    # Read at the ref, never the working tree: the base is what the change is compared with.
    shown = subprocess.run(['git', '-C', specs.repo_root(), 'show', f'{args.base}:{path}'], capture_output=True)
    target = os.path.join('specs', specs.BASE_DIR, path)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    open(target, 'wb').write(shown.stdout if shown.returncode == 0 else b'')
    print(f'base {path}: {"new at " + args.base if shown.returncode else args.base}')
refreshed = specs.refresh('.')

# The artifact page cannot load images from other hosts, so GitHub avatars ship as files beside it.
AVATAR_URL = rb'`https://avatars\.githubusercontent\.com/\$\{(\w+)\}\?s=64`'
handles = set()
for script in glob.glob('**/*.js', recursive=True):
    data = open(script, 'rb').read()
    if re.search(AVATAR_URL, data):
        # Specs a --spec tab fetches are not in the bundle, so their deciders are read from the shipped files too.
        sources = glob.glob('**/*.js', recursive=True) + glob.glob('specs/**/*.mdl', recursive=True)
        handles.update(re.findall(rb'by: *(?:user|agent):([A-Za-z\d-]+)', b'\n'.join(
            open(source, 'rb').read() for source in sources)))
        open(script, 'wb').write(re.sub(AVATAR_URL, rb'`avatars/${\1}.jpg`', data))
os.makedirs('avatars', exist_ok=True)
for handle in sorted(handle.decode() for handle in handles):
    try:
        with urllib.request.urlopen(f'https://avatars.githubusercontent.com/{handle}?s=64', timeout=20) as response:
            open(f'avatars/{handle}.jpg', 'wb').write(response.read())
    except OSError as error:
        print(f'avatar {handle}: {error}')

print(f'specs: {len(specs.read_manifest("."))} shipped, {len(refreshed)} changed in the working tree since the build')
print(f'wrote {os.path.join(args.out, "page.html")} with {len(tabs)} tabs')
