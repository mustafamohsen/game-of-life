export type CellCoordinate = readonly [x: number, y: number];

export type PatternBounds = {
  maxX: number;
  maxY: number;
};

export function patternBounds(cells: readonly CellCoordinate[]): PatternBounds {
  return {
    maxX: Math.max(...cells.map(([x]) => x)),
    maxY: Math.max(...cells.map(([, y]) => y)),
  };
}

export function centerPatternCells(
  cells: readonly CellCoordinate[],
  centerX: number,
  centerY: number,
): readonly CellCoordinate[] {
  const { maxX, maxY } = patternBounds(cells);
  const originX = centerX - Math.floor((maxX + 1) / 2);
  const originY = centerY - Math.floor((maxY + 1) / 2);
  return cells.map(([x, y]) => [originX + x, originY + y]);
}
