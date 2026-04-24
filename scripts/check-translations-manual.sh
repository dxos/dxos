#!/bin/bash
#
# Lists translation keys requiring manual fixes.
# Usage: ./scripts/check-translations-manual.sh
#

set -euo pipefail

TOTAL=0

# Find keys with empty values in translations.ts files.
EMPTY_VALUES=$(grep -rn "'[^']*':\s*''," --include='translations.ts' packages/ | grep -v node_modules | sort)
EMPTY_COUNT=$(echo "$EMPTY_VALUES" | grep -c . || true)

echo ""
echo "Empty Values ($EMPTY_COUNT)"
echo ""
{
  echo "FILE|KEY"
  echo "$EMPTY_VALUES" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    key=$(echo "$line" | sed "s/.*'\\([^']*\\)': *''.*/\\1/")
    echo "$file:$lineno|$key"
  done
} | column -t -s'|'
TOTAL=$((TOTAL + EMPTY_COUNT))

# Lint-based checks (only useful after running: moon exec --on-failure continue --quiet :lint -- --fix)
OUTPUT=$(moon exec --on-failure continue --quiet :lint 2>&1 | grep "translation-key-format" || true)

if [ -n "$OUTPUT" ]; then
  CLEAN=$(echo "$OUTPUT" | sed 's/^[^|]*| //')

  MISSING_SUFFIX=$(echo "$CLEAN" | grep "Invalid translation key" | sed 's/ \[Warning.*//' | sort -u || true)
  UNDEFINED=$(echo "$CLEAN" | grep "not defined in translations" | sed 's/ \[Warning.*//' | sort -u || true)

  MISSING_COUNT=$(echo "$MISSING_SUFFIX" | grep -c . || true)
  UNDEFINED_COUNT=$(echo "$UNDEFINED" | grep -c . || true)

  if [ "$MISSING_COUNT" -gt 0 ]; then
    echo ""
    echo "Invalid Key Format ($MISSING_COUNT)"
    echo ""
    {
      echo "FILE|KEY"
      echo "$MISSING_SUFFIX" | while IFS= read -r line; do
        [ -z "$line" ] && continue
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        key=$(echo "$line" | sed 's/.*Invalid translation key: "//;s/".*//')
        echo "$file:$lineno|$key"
      done
    } | column -t -s'|'
    TOTAL=$((TOTAL + MISSING_COUNT))
  fi

  if [ "$UNDEFINED_COUNT" -gt 0 ]; then
    echo ""
    echo "Undefined Keys ($UNDEFINED_COUNT)"
    echo ""
    {
      echo "FILE|KEY"
      echo "$UNDEFINED" | while IFS= read -r line; do
        [ -z "$line" ] && continue
        file=$(echo "$line" | cut -d: -f1)
        lineno=$(echo "$line" | cut -d: -f2)
        key=$(echo "$line" | sed 's/.*Translation key "//;s/" is not.*//')
        echo "$file:$lineno|$key"
      done
    } | column -t -s'|'
    TOTAL=$((TOTAL + UNDEFINED_COUNT))
  fi
fi

echo ""
echo "Total: $TOTAL issues"
