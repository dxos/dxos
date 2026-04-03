#!/bin/bash
#
# Lists translation keys requiring manual fixes.
# Usage: ./scripts/check-translations-manual.sh
#

set -euo pipefail

echo "Scanning all packages..." >&2

OUTPUT=$(moon exec --on-failure continue --quiet :lint 2>&1 | grep "translation-key-format" || true)

# Strip moon task prefix (e.g., "   package-name:lint | ") to get raw lint output.
CLEAN=$(echo "$OUTPUT" | sed 's/^[^|]*| //')

MISSING_SUFFIX=$(echo "$CLEAN" | grep "must end with a type suffix" | sed 's/ \[Warning.*//' | sort -u)
UNDEFINED=$(echo "$CLEAN" | grep "not defined in translations" | sed 's/ \[Warning.*//' | sort -u)

MISSING_COUNT=$(echo "$MISSING_SUFFIX" | grep -c . || true)
UNDEFINED_COUNT=$(echo "$UNDEFINED" | grep -c . || true)

echo ""
echo "Missing Suffix ($MISSING_COUNT)"
echo ""
{
  echo "FILE KEY"
  echo "$MISSING_SUFFIX" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    key=$(echo "$line" | sed 's/.*Translation key "//;s/" must.*//')
    echo "$file:$lineno $key"
  done
} | column -t

echo ""
echo "Undefined Keys ($UNDEFINED_COUNT)"
echo ""
{
  echo "FILE KEY NAMESPACE"
  echo "$UNDEFINED" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    key=$(echo "$line" | sed 's/.*Translation key "//;s/" is not.*//')
    ns=$(echo "$line" | sed 's/.*namespace "//;s/".*//')
    echo "$file:$lineno $key $ns"
  done
} | column -t

echo ""
echo "Total: $((MISSING_COUNT + UNDEFINED_COUNT)) issues"
