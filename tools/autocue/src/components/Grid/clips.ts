//
// Copyright 2026 DXOS.org
//

/**
 * Re-deals the clips of a drifting wall so no recording shows twice in one column. `layout.mjs` copies a run's few
 * recordings into many cells, so a column drifting past would otherwise show the same clip more than once. Tour
 * clips stay on their cells; every other recording keeps its overall count (so a clip placed once stays once). A cell
 * keeps its own clip while its column does not hold that recording yet, so a pinned or once-only clip stays where
 * `layout.mjs` put it; otherwise it takes the recording with the most copies left that its column does not hold.
 *
 * @param clips Each cell's current clip file, by cell id.
 * @param columns Each column's cell ids, top to bottom.
 * @param recordings The recording each clip file copies (`layout.json`); a file missing from it is its own recording.
 * @returns Each cell's new clip file, by cell id.
 */
export const spreadClips = (
  clips: Map<string, string | undefined>,
  columns: string[][],
  recordings: Record<string, string>,
): Map<string, string | undefined> => {
  const recordingOf = (clip: string) => recordings[clip] ?? clip;
  const fixed = (clip: string | undefined) => clip === undefined || clip.startsWith('tour-');
  const left = new Map<string, number>();
  const files = new Map<string, string>();
  for (const clip of clips.values()) {
    if (!fixed(clip) && clip !== undefined) {
      const recording = recordingOf(clip);
      left.set(recording, (left.get(recording) ?? 0) + 1);
      files.set(recording, files.get(recording) ?? clip);
    }
  }
  const result = new Map(clips);
  for (const column of columns) {
    const held = new Set(
      column.flatMap((id) => {
        const clip = clips.get(id);
        return clip !== undefined && fixed(clip) ? [recordingOf(clip)] : [];
      }),
    );
    for (const id of column) {
      const clip = clips.get(id);
      if (fixed(clip)) {
        continue;
      }
      const own = clip === undefined ? undefined : recordingOf(clip);
      const ranked = [...left].filter(([, count]) => count > 0).sort(([a, x], [b, y]) => y - x || a.localeCompare(b));
      const [recording] =
        own !== undefined && !held.has(own) && (left.get(own) ?? 0) > 0
          ? [own]
          : (ranked.find(([candidate]) => !held.has(candidate)) ?? ranked[0] ?? []);
      if (recording !== undefined) {
        left.set(recording, (left.get(recording) ?? 1) - 1);
        held.add(recording);
        result.set(id, files.get(recording));
      }
    }
  }
  return result;
};
