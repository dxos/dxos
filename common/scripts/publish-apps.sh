#/bin/sh

set -euo pipefail

dx profile init --name $DX_PROFILE --template-url "$DX_PROFILE_URL"
DXOS_DOMAIN="${DXOS_DOMAIN:-dxos}"

for APP_PATH in "packages/sdk/demos" "packages/sdk/tutorials/apps/tasks-app"
do
  cd $APP_PATH

  # Take an app or frame name, stripping "-app" or "-frame" suffix.
  PKG_NAME=`cat package.json | jq -r '.name' | cut -d'/' -f2- | sed 's/-app$//' | sed 's/-frame$//'`

  echo "::group::Publishing $PKG_NAME"
  
  # Canary deployment
  dx app --verbose deploy --name "app.${PKG_NAME}" --domain $DXOS_DOMAIN --tag dev --version=false

  # Latest version deployment
  dx app --verbose deploy --name "app.${PKG_NAME}" --domain $DXOS_DOMAIN --tag latest --skipExisting

  cd -
  echo "::endgroup::"
done
