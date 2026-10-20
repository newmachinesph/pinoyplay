export const difficulties = ['easy', 'normal', 'hard'] as const;
export type Difficulty = typeof difficulties[number];
export const difficultyLabel: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
export const isDifficulty = (value: unknown): value is Difficulty => difficulties.includes(value as Difficulty);
export const rushTuning = {
  easy: { startSpeed: 13, maxSpeed: 24, ramp: 300, interval: 2.5, minInterval: 1.5, levelDistance: 400, doubleFrom: 5, firstCrossing: 320 },
  normal: { startSpeed: 16, maxSpeed: 30, ramp: 210, interval: 2.05, minInterval: 1.2, levelDistance: 300, doubleFrom: 3, firstCrossing: 270 },
  hard: { startSpeed: 19, maxSpeed: 34, ramp: 160, interval: 1.7, minInterval: 1.05, levelDistance: 250, doubleFrom: 2, firstCrossing: 240 },
};
export const courtTuning = {
  easy: { pace: 0.56, maxPace: 1.35, seconds: 65, minSeconds: 42, tagRadius: 22 },
  normal: { pace: 0.75, maxPace: 1.8, seconds: 50, minSeconds: 32, tagRadius: 25 },
  hard: { pace: 0.94, maxPace: 2.1, seconds: 38, minSeconds: 26, tagRadius: 26 },
};
