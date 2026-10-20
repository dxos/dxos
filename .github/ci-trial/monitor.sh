#!/usr/bin/env bash
# CI trial: samples memory, swap, load and disk every 2 s, plus RSS grouped by process name every
# 6 s, then reports the peaks and what held the memory at the peak to the step summary.
#   monitor.sh start    # once, before setup
#   monitor.sh report   # last step, under `if: always()`
set -euo pipefail

log="${RUNNER_TEMP:-/tmp}/resources.log"
procs="${RUNNER_TEMP:-/tmp}/processes.log"

case "${1:-}" in
  start)
    echo "cpus=$(nproc)"
    free -m
    df -h /
    nohup setsid bash -c '
      i=0
      while :; do
        now=$(date +%s)
        mem=$(free -m | awk "/^Mem:/ {print \$3}")
        swap=$(free -m | awk "/^Swap:/ {print \$3}")
        load=$(cut -d" " -f1 /proc/loadavg)
        disk=$(df -m / | awk "NR==2 {print \$3}")
        echo "$now $mem $swap $load $disk" >> "'"$log"'"
        if [ $((i % 3)) -eq 0 ]; then
          ps -eo rss=,comm= | awk -v t="$now" "{ sum[\$2] += \$1; n[\$2]++ } END { for (c in sum) printf \"%s %s %d %d\n\", t, c, sum[c] / 1024, n[c] }" >> "'"$procs"'"
        fi
        i=$((i + 1))
        sleep 2
      done' >/dev/null 2>&1 &
    ;;
  report)
    [ -s "$log" ] || { echo "no samples"; exit 0; }
    oom=$(sudo dmesg 2>/dev/null | grep -ciE 'out of memory|oom-kill|killed process' || true)
    summary=$(awk -v oom="$oom" '
      NR == 1 { first = $1; disk0 = $5 }
      { if ($2 > mem) { mem = $2; at = $1 } if ($3 > swap) swap = $3; if ($4 > load) load = $4; if ($5 > disk) disk = $5; sum += $4; n++; last = $1 }
      END {
        printf "| %.1f GB | %.1f GB | %.1f | %.1f | %+.1f GB (peak %.1f GB used) | %d | %.1f min |\n",
          mem / 1024, swap / 1024, load, sum / n, (disk - disk0) / 1024, disk / 1024, oom, (last - first) / 60
        print at > "/dev/stderr"
      }' "$log" 2>"${RUNNER_TEMP:-/tmp}/peak-at")
    peak_at=$(cat "${RUNNER_TEMP:-/tmp}/peak-at")
    {
      echo "### Resources: ${JOB_LABEL:-$GITHUB_JOB}"
      echo
      echo "| Peak RAM | Peak swap | Peak load | Avg load | Disk growth | OOM lines | Sampled |"
      echo "| --: | --: | --: | --: | --: | --: | --: |"
      echo "$summary"
      if [ -s "$procs" ]; then
        # The process snapshot nearest the total-RAM peak. RSS double-counts shared pages, so the
        # column sums past the total; it ranks what held the memory rather than adding up to it.
        snap=$(awk -v at="$peak_at" '{ d = $1 - at; if (d < 0) d = -d; if (best == "" || d < best) { best = d; t = $1 } } END { print t }' "$procs")
        echo
        echo "RSS by process name at the RAM peak:"
        echo
        echo "| Process | RSS | Count | Own peak RSS |"
        echo "| :-- | --: | --: | --: |"
        awk -v t="$snap" '
          { if ($3 > peak[$2]) peak[$2] = $3 }
          $1 == t { rss[$2] = $3; cnt[$2] = $4 }
          END { for (c in rss) printf "%d %s %d %d\n", rss[c], c, cnt[c], peak[c] }' "$procs" |
          sort -rn | head -10 |
          awk '{ printf "| %s | %.1f GB | %d | %.1f GB |\n", $2, $1 / 1024, $3, $4 / 1024 }'
      fi
    } | tee -a "$GITHUB_STEP_SUMMARY"
    df -h /
    ;;
  *)
    echo "usage: $0 start|report" >&2
    exit 2
    ;;
esac
