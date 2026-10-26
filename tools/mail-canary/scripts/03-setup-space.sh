#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Step 03: create the canary's preview identity and space with the dx CLI, print the two values the
# nightly job needs, and verify the space once its Gmail sync is bound.
#
# Usage:
#   scripts/03-setup-space.sh create <hub access code>   # profile, identity, space, recovery phrase
#   scripts/03-setup-space.sh verify <space id>          # mailbox, sync trigger and trace feed exist
#
# Between the two, bind Gmail in Composer (see README, step 03): the CLI cannot create the mailbox
# binding and its sync routine yet.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DX="$ROOT/packages/devtools/cli/bin/dx"
ACCOUNT="${GMAIL_ACCOUNT:-test@braneframe.com}"
SPACE_NAME="${CANARY_SPACE_NAME:-Mail canary}"
export DX_PROFILE="${DX_PROFILE:-mail-canary}"

create() {
  local access_code="${1:?usage: 03-setup-space.sh create <hub access code>}"

  "$DX" profile create --template preview --name "$DX_PROFILE"

  # Binds the identity to a hub account for the test address; follow the link the hub emails.
  "$DX" account signup --method email "$access_code" "$ACCOUNT"

  "$DX" space create --name "$SPACE_NAME"
  local space_id
  space_id="$("$DX" --json space list | node -e '
    const spaces = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
    const space = spaces.find((entry) => entry.name === process.argv[1]);
    if (!space) { console.error(`no space named ${process.argv[1]}`); process.exit(1); }
    console.log(space.id);
  ' "$SPACE_NAME")"

  local recovery_phrase
  recovery_phrase="$("$DX" --json halo seed | node -e '
    console.log(JSON.parse(require("node:fs").readFileSync(0, "utf8")).recoveryCode);
  ')"

  cat <<EOF

Created space "$SPACE_NAME" for $ACCOUNT on preview.

  Repository variable MAIL_CANARY_SPACE_ID = $space_id
  Repository secret   MAIL_CANARY_RECOVERY_PHRASE = (printed below, once; store it now)

$recovery_phrase

Next: bind Gmail in Composer (README, step 03), then run:
  scripts/03-setup-space.sh verify $space_id
EOF
}

verify() {
  local space_id="${1:?usage: 03-setup-space.sh verify <space id>}"
  local program
  program="$(mktemp)"
  cat >"$program" <<'EOF'
const count = (typename, props) => Database.query(Filter.type(DXN.make(typename), props)).run;
const mailboxes = yield* count('org.dxos.type.mailbox');
const triggers = (yield* count('org.dxos.type.trigger')).filter((trigger) => trigger.spec?.kind === 'timer' && trigger.remote === true);
const traceFeeds = yield* count('org.dxos.type.feed', { kind: 'dxos.org.feed.trace' });
yield* print(JSON.stringify({
  mailboxes: mailboxes.length,
  remoteTimerTriggers: triggers.map((trigger) => ({ id: trigger.id, enabled: trigger.enabled === true, cron: trigger.spec?.cron })),
  traceFeeds: traceFeeds.length,
}, null, 2));
EOF
  "$DX" eval --space-id "$space_id" --file "$program"
  rm -f "$program"
  echo
  echo "Expect one mailbox, one enabled remote timer trigger (the */10 mail sync) and one trace feed."
}

case "${1:-}" in
  create) shift && create "$@" ;;
  verify) shift && verify "$@" ;;
  *)
    echo "usage: 03-setup-space.sh create <hub access code> | verify <space id>" >&2
    exit 1
    ;;
esac
