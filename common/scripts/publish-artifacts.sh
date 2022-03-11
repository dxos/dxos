#/bin/sh

set -euo pipefail

VERSION=${1#?}

if [[ -z "$VERSION" ]]; then
  echo "Version should be provided" 1>&2
  exit 1
fi

[[ -e ~/.dx/profile/default ]] || dx profile init --name $DX_PROFILE --template-url "$DX_PROFILE_URL"
[[ -e ~/.dx/storage ]] || dx halo init --name $DX_PROFILE
DXOS_DOMAIN="${DXOS_DOMAIN:-dxos}"

echo "Publishing version $VERSION"

for ARTIFACT_PATH in \
  "artifacts/devtools.zip" \
  "artifacts/wallet.zip"
do

  ARTIFACT_NAME=`basename $ARTIFACT_PATH .zip`

  [[ -f "$ARTIFACT_PATH" ]] && echo "Publishing $ARTIFACT_NAME" && dx ipfs upload $ARTIFACT_PATH --account $DX_DXNS_ACCOUNT --domain $DXOS_DOMAIN --name file.$ARTIFACT_NAME --version $VERSION

done
