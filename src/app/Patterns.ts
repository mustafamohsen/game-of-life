export type LifePattern = {
  id: string;
  name: string;
  description: string;
  cells: readonly [number, number][];
};

const fromRows = (id: string, name: string, description: string, rows: readonly string[]): LifePattern => ({
  id,
  name,
  description,
  cells: rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === 'O' ? [[x, y] as [number, number]] : [])),
});

export const LIFE_PATTERNS = [
  fromRows('glider', 'Glider', 'Small spaceship that drifts diagonally.', [
    '.O.',
    '..O',
    'OOO',
  ]),
  fromRows('lwss', 'Lightweight spaceship', 'Moves horizontally across the grid.', [
    '.O..O',
    'O....',
    'O...O',
    'OOOO.',
  ]),
  fromRows('blinker', 'Blinker', 'Small period-2 oscillator.', [
    'OOO',
  ]),
  fromRows('toad', 'Toad', 'Period-2 oscillator.', [
    '.OOO',
    'OOO.',
  ]),
  fromRows('beacon', 'Beacon', 'Period-2 oscillator made of two blocks.', [
    'OO..',
    'OO..',
    '..OO',
    '..OO',
  ]),
  fromRows('pulsar', 'Pulsar', 'Classic period-3 oscillator.', [
    '..OOO...OOO..',
    '.............',
    'O....O.O....O',
    'O....O.O....O',
    'O....O.O....O',
    '..OOO...OOO..',
    '.............',
    '..OOO...OOO..',
    'O....O.O....O',
    'O....O.O....O',
    'O....O.O....O',
    '.............',
    '..OOO...OOO..',
  ]),
  fromRows('pentadecathlon', 'Pentadecathlon', 'Period-15 oscillator.', [
    '..O..',
    '..O..',
    '.O.O.',
    '..O..',
    '..O..',
    '..O..',
    '..O..',
    '.O.O.',
    '..O..',
    '..O..',
  ]),
  fromRows('block', 'Block', 'Stable 2×2 still life.', [
    'OO',
    'OO',
  ]),
  fromRows('beehive', 'Beehive', 'Common six-cell still life.', [
    '.OO.',
    'O..O',
    '.OO.',
  ]),
  fromRows('boat', 'Boat', 'Compact five-cell still life.', [
    'OO.',
    'O.O',
    '.O.',
  ]),
  fromRows('diehard', 'Diehard', 'Methuselah pattern that eventually disappears.', [
    '......O.',
    'OO......',
    '.O...OOO',
  ]),
  fromRows('acorn', 'Acorn', 'Small seed with long chaotic growth.', [
    '.O.....',
    '...O...',
    'OO..OOO',
  ]),
  fromRows('rPentomino', 'R-pentomino', 'Famous methuselah with long evolution.', [
    '.OO',
    'OO.',
    '.O.',
  ]),
  fromRows('queenBee', 'Queen bee shuttle', 'Oscillator commonly used in larger guns.', [
    '...O...',
    '..O.O..',
    '.O...O.',
    '..OOO..',
  ]),
  fromRows('gosper', 'Gosper glider gun', 'First known pattern with unbounded growth.', [
    '........................O...........',
    '......................O.O...........',
    '............OO......OO............OO',
    '...........O...O....OO............OO',
    'OO........O.....O...OO..............',
    'OO........O...O.OO....O.O...........',
    '..........O.....O.......O...........',
    '...........O...O....................',
    '............OO......................',
  ]),
  fromRows('simkin', 'Simkin glider gun', 'Compact glider gun with two block pairs.', [
    'OO.....OO...........................',
    'OO.....OO...........................',
    '....................................',
    '....OO..............................',
    '....OO..............................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '....................................',
    '........................OO.OO.......',
    '.......................O.....O......',
    '.......................O......O..OO.',
    '.......................OOO...O...OO.',
    '...........................O.O......',
    '..........................O..O......',
    '..........................OO........',
  ]),
] as const;

export type PatternId = typeof LIFE_PATTERNS[number]['id'];
