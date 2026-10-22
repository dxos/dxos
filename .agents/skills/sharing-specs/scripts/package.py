#!/usr/bin/env python3
#
# Copyright 2026 DXOS.org
#
"""Turn a static storybook build into one Claude Artifact page with a tab per story.

Usage:
  python3 package.py <storybook build dir> <out dir> --title "GitHub Sync Specs" \
    --tab "1 · Polling sync=plugins-plugin-code-components-specchangelog--git-hub-sync" \
    --tab "2 · File sync=plugins-plugin-code-components-specchangelog--git-hub-file-sync"

Writes <out dir>/page.html plus the build's files, adjusted for the artifact publisher:
  - the page selects the first story by rewriting its own query (an artifact link carries no query),
  - tabs switch stories through Storybook's preview channel (links cannot leave the artifact frame),
  - <html>/<head>/<body> wrappers are removed (the publisher adds its own skeleton),
  - control bytes and U+FFFD in JS become escapes, and the icon sprite loses its DOCTYPE
    (the publisher rejects both),
  - GitHub avatars are downloaded into avatars/ and the bundle points at them (no external images).
"""

import argparse
import glob
import html
import json
import os
import re
import shutil
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('build')
parser.add_argument('out')
parser.add_argument('--title', required=True)
parser.add_argument('--tab', action='append', required=True, help='"Label=story-id", in tab order')
args = parser.parse_args()

tabs = [tab.split('=', 1) for tab in args.tab]
shutil.rmtree(args.out, ignore_errors=True)
shutil.copytree(args.build, args.out)
os.chdir(args.out)

page = open('iframe.html').read()
page = re.sub(r'(?is)<title>.*?</title>', '', page)

head = f"""<title>{html.escape(args.title)}</title>
<script>
  // An artifact link carries no query, so the page selects its first story before Storybook reads it.
  (function () {{
    var query = '?id=' + {json.dumps(tabs[0][1])} + '&viewMode=story';
    if (location.search !== query) {{
      try {{ history.replaceState(null, '', location.pathname + query + location.hash); }} catch (error) {{}}
    }}
  }})();
</script>
"""

buttons = '\n'.join(
    f'  <button role="tab" data-story="{html.escape(story)}">{html.escape(label)}</button>' for label, story in tabs
)
tab_bar = f"""
<style>
  #spec-tabs {{ position: fixed; inset: 0 0 auto; z-index: 1000; display: flex; gap: 2px; height: 40px; align-items: stretch;
    padding: 0 max(12px, env(safe-area-inset-right, 0px)) 0 max(12px, env(safe-area-inset-left, 0px));
    background: #111318; border-bottom: 1px solid #2a2f3a; font: 500 13px/1 system-ui, sans-serif; overflow-x: auto; }}
  #spec-tabs button {{ all: unset; cursor: pointer; padding: 0 14px; color: #9aa3b2; border-bottom: 2px solid transparent; white-space: nowrap; }}
  #spec-tabs button:hover {{ color: #e5e7eb; }}
  #spec-tabs button:focus-visible {{ outline: 2px solid #60a5fa; outline-offset: -2px; }}
  #spec-tabs button[aria-selected="true"] {{ color: #f3f4f6; border-bottom-color: #60a5fa; }}
  /* Full-screen stories render into a fixed, inset-0 wrapper, so it is moved below the tab bar rather than padded. */
  #storybook-root > .fixed.inset-0 {{ top: 40px !important; }}
  #storybook-root {{ padding-top: 40px; box-sizing: border-box; }}
  #storybook-root:has(> .fixed.inset-0) {{ padding-top: 0; }}
</style>
<nav id="spec-tabs" role="tablist" aria-label="Stories">
{buttons}
</nav>
<script>
  // Links cannot leave the artifact frame, so tabs ask Storybook's preview to swap the story in place.
  (function () {{
    var tabs = document.querySelectorAll('#spec-tabs button');
    var mark = function (storyId) {{
      tabs.forEach(function (tab) {{ tab.setAttribute('aria-selected', String(tab.dataset.story === storyId)); }});
    }};
    mark(new URLSearchParams(location.search).get('id'));
    tabs.forEach(function (tab) {{
      tab.addEventListener('click', function () {{
        var preview = window.__STORYBOOK_PREVIEW__;
        if (!preview || !preview.channel) {{ return; }}
        preview.channel.emit('setCurrentStory', {{ storyId: tab.dataset.story, viewMode: 'story' }});
        mark(tab.dataset.story);
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

# The artifact page cannot load images from other hosts, so GitHub avatars ship as files beside it.
AVATAR_URL = rb'`https://avatars\.githubusercontent\.com/\$\{(\w+)\}\?s=64`'
handles = set()
for script in glob.glob('**/*.js', recursive=True):
    data = open(script, 'rb').read()
    if re.search(AVATAR_URL, data):
        handles.update(re.findall(rb'by: *(?:user|agent):([A-Za-z\d-]+)', b'\n'.join(
            open(bundle, 'rb').read() for bundle in glob.glob('**/*.js', recursive=True))))
        open(script, 'wb').write(re.sub(AVATAR_URL, rb'`avatars/${\1}.jpg`', data))
os.makedirs('avatars', exist_ok=True)
for handle in sorted(handle.decode() for handle in handles):
    try:
        with urllib.request.urlopen(f'https://avatars.githubusercontent.com/{handle}?s=64', timeout=20) as response:
            open(f'avatars/{handle}.jpg', 'wb').write(response.read())
    except OSError as error:
        print(f'avatar {handle}: {error}')

for sprite in glob.glob('**/*.svg', recursive=True):
    text = open(sprite, encoding='utf-8', errors='surrogateescape').read()
    open(sprite, 'w', encoding='utf-8', errors='surrogateescape').write(re.sub(r'<!DOCTYPE[^>]*>', '', text, count=1))

print(f'wrote {os.path.join(args.out, "page.html")} with {len(tabs)} tabs')
