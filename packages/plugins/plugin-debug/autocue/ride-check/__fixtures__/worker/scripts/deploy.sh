#!/usr/bin/env bash
# Build the page, then deploy; the filter drops the proxy notice and the per-file upload list.
set -o pipefail
vite build --logLevel error && wrangler deploy 2>&1 | grep -vE 'Proxy environment|^\+ /|WARNING|^\s*$'
