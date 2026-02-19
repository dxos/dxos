#!/bin/sh

# Build and test production bundle
NODE_ENV=development DX_MOBILE=1 NODE_OPTIONS="--max-old-space-size=8192" DX_PWA=false moon run composer-app:bundle -- --mode development
pnpm exec vite preview
