#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook: when the user has toggled concise mode on (via the
# `/concise` command), inject the terseness directive into the prompt context.
# Prints nothing in natural mode, so it is a no-op unless the mode is active.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
exec bash "$root/.claude/scripts/response-mode.sh" context
