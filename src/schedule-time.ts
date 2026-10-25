/** Resolve a local wall time on the backend. DST folds require an explicit UTC offset. */
export function resolveScheduleLocalTime(
  local: string,
  timeZone: string,
  offsetMinutes?: number,
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/u.exec(
    local,
  );
  if (!match) throw new Error("Use YYYY-MM-DDTHH:mm[:ss]");
  const parts = match.slice(1).map((value) => Number(value ?? 0));
  const wall = Date.UTC(
    parts[0]!,
    parts[1]! - 1,
    parts[2]!,
    parts[3]!,
    parts[4]!,
    parts[5]!,
  );
  const expected = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? "00"}`;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const candidates: { instant: string; offset: number }[] = [];
  for (let offset = -840; offset <= 840; offset += 15) {
    const instant = new Date(wall - offset * 60000),
      p = Object.fromEntries(
        formatter.formatToParts(instant).map((part) => [part.type, part.value]),
      );
    if (
      `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` ===
      expected
    )
      candidates.push({ instant: instant.toISOString(), offset });
  }
  if (!candidates.length)
    throw new Error("This local time does not exist in the selected time zone");
  if (offsetMinutes === undefined && candidates.length !== 1)
    throw new Error(
      "This local time occurs twice; supply an explicit UTC offset in minutes",
    );
  const selected =
    offsetMinutes === undefined
      ? candidates[0]
      : candidates.find((candidate) => candidate.offset === offsetMinutes);
  if (!selected)
    throw new Error(
      "The supplied UTC offset does not match the selected local time",
    );
  return selected.instant;
}
