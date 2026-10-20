#!/usr/bin/env bash
# CI trial: samples memory, swap, load and disk every 2 s, then reports the peaks to the step summary.
#   monitor.sh start    # once, before setup
#   monitor.sh report   # last step, under `if: always()`
set -euo pipefail

log="${RUNNER_TEMP:-/tmp}/resources.log"

case "${1:-}" in
  start)
    echo "cpus=$(nproc)"
    free -m
    df -h /
    nohup setsid bash -c '
      while :; do
        mem=$(free -m | awk "/^Mem:/ {print \$3}")
        swap=$(free -m | awk "/^Swap:/ {print \$3}")
        load=$(cut -d" " -f1 /proc/loadavg)
        disk=$(df -m / | awk "NR==2 {print \$3}")
        echo "$(date +%s) $mem $swap $load $disk" >> "'"$log"'"
        sleep 2
      done' >/dev/null 2>&1 &
    ;;
  report)
    [ -s "$log" ] || { echo "no samples"; exit 0; }
    oom=$(sudo dmesg 2>/dev/null | grep -ciE 'out of memory|oom-kill|killed process' || true)
    summary=$(awk -v oom="$oom" '
      NR == 1 { first = $1; disk0 = $5 }
      { if ($2 > mem) mem = $2; if ($3 > swap) swap = $3; if ($4 > load) load = $4; if ($5 > disk) disk = $5; sum += $4; n++; last = $1 }
      END {
        printf "| %.1f GB | %.1f GB | %.1f | %.1f | %+.1f GB (peak %.1f GB used) | %d | %.1f min |\n",
          mem / 1024, swap / 1024, load, sum / n, (disk - disk0) / 1024, disk / 1024, oom, (last - first) / 60
      }' "$log")
    {
      echo "### Resources: ${JOB_LABEL:-$GITHUB_JOB}"
      echo
      echo "| Peak RAM | Peak swap | Peak load | Avg load | Disk growth | OOM lines | Sampled |"
      echo "| --: | --: | --: | --: | --: | --: | --: |"
      echo "$summary"
    } | tee -a "$GITHUB_STEP_SUMMARY"
    df -h /
    ;;
  *)
    echo "usage: $0 start|report" >&2
    exit 2
    ;;
esac
