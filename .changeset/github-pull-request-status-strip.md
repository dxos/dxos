---
'@dxos/plugin-github': minor
---

The pull request article shows a status strip again: the pull request's reference and title, and
whether it is open, merged or closed, whether it is approved or has changes requested, and whether CI
is passing. `GetPullRequestStatus` now also returns the review verdict (`review`) and the number of
approving reviewers (`approvals`), read from each reviewer's latest review.
