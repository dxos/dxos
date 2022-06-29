# rush update
# rush build --to @dxos/react-toolkit
rush publish --include-all --pack -p

HASH=$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 6)

echo "Saving to common/temp/artifacts/local-$HASH"

rm -r common/temp/artifacts/local-*
cp -r common/temp/artifacts/packages common/temp/artifacts/local-$HASH