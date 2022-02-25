#/bin/sh

set -euo pipefail

[[ -e ~/.dx/profile/default ]] || dx profile init --name $DX_PROFILE --template-url "$DX_PROFILE_URL"
[[ -e ~/.dx/storage ]] || dx halo init --name $DX_PROFILE
DXOS_DOMAIN="${DXOS_DOMAIN:-dxos}"

for APP_PATH in \
  "packages/demos/hello-world" \
  "packages/demos/kitchen-sink" \
  "packages/demos/tutorials-tasks-app" \
  "packages/devtools/devtools" \
  "packages/devtools/devtools-mesh" \
  "packages/sdk/react-client" \
  "packages/sdk/react-components" \
  "packages/sdk/react-framework" \
  "packages/sdk/react-registry-client" \
  "packages/wallet/wallet-playground"
do
  cd $APP_PATH

  # Take an app or frame name, stripping "-app" or "-frame" suffix.
  PKG_NAME=`cat package.json | jq -r '.name' | cut -d'/' -f2- | sed 's/-app$//' | sed 's/-frame$//'`

  echo "::group::Publishing $PKG_NAME"
  
  # Canary deployment
  dx dxns --verbose deploy --tag dev --version=false

  # Latest version deployment
  dx dxns --verbose deploy --tag latest --skipExisting

  cd -
  echo "::endgroup::"
done
