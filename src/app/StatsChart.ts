import type { StatsSample } from "./StatsTimeline";

export function buildLinePath(
  values: readonly number[],
  width: number,
  height: number,
  forcedMax?: number,
): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `M 0 ${height} L ${width} ${height}`;

  const max = forcedMax ?? Math.max(1, ...values);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildEventMarkers(
  history: readonly StatsSample[],
  width: number,
  height: number,
): string {
  if (history.length <= 1) return "";

  return history
    .flatMap((sample, index) => {
      if (!sample.event || sample.event === "step") return [];
      const x = (index / (history.length - 1)) * width;
      return `<line x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="0" y2="${height}" />`;
    })
    .join("");
}
