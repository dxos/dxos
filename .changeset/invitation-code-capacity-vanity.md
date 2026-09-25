---
'@dxos/protocols': minor
'@dxos/app-toolkit': minor
---

Invitation codes can have a capacity and a vanity prefix, so one code such as `SF-MEETUP-7K2Q` can sign up up to 100 people at an event.

`InvitationCodeSchema` accepts vanity codes (letters, digits and hyphens, any case, 8–50 characters). `AdminCreateInvitationCodesRequestSchema` gains `planName`, `maxRedemptions` (1–100) and `prefix`, and refuses a batch of vanity codes or a plan on a multi-use code. `AdminListInvitationCodesResponse` rows carry optional `maxRedemptions` and `redemptionCount`.

`Account.isValidAccessCodeFormat` accepts vanity codes, so the welcome screen and `dx` signup no longer reject them before they reach the hub. Codes are still sent without hyphens and in upper case.
