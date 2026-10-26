# `op run --env-file tools/mail-canary/gmail.env.tpl -- <command>` resolves these references into the
# environment; scripts/02-import-pool.mjs does so when no other grant is set. Never put a value in this file.
# The item is named by id: `op run` does not resolve `eng-dev/com.google` by name.
GMAIL_CLIENT_ID=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/dev/CLIENT_ID
GMAIL_CLIENT_SECRET=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/dev/CLIENT_SECRET
GMAIL_REFRESH_TOKEN=op://eng-dev/ywmy6udhpxhio2ztweplllyvgq/mail-canary/GMAIL_REFRESH_TOKEN
