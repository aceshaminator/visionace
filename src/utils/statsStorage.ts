export interface UserStats {
  totalAttempts: number;
  correctAttempts: number;
  streak: number;
  lastUpdated: number;
}

const STATS_KEY = 'visionace_motion_stats';

// Fetch existing stats or return default initial values
export async function getUserStats(): Promise<UserStats> {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to read user stats from localStorage:', error);
  }
  return {
    totalAttempts: 0,
    correctAttempts: 0,
    streak: 0,
    lastUpdated: Date.now(),
  };
}

// Record an answer attempt from the Haptic Trainer and update metrics
export async function recordTrainerAttempt(isCorrect: boolean): Promise<UserStats> {
  const currentStats = await getUserStats();

  const updatedStats: UserStats = {
    totalAttempts: currentStats.totalAttempts + 1,
    correctAttempts: isCorrect ? currentStats.correctAttempts + 1 : currentStats.correctAttempts,
    streak: isCorrect ? currentStats.streak + 1 : 0, // Reset streak on incorrect answer
    lastUpdated: Date.now(),
  };

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
  } catch (error) {
    console.error('Failed to save user stats to localStorage:', error);
  }

  return updatedStats;
}

// Reset stats back to zero
export async function resetUserStats(): Promise<UserStats> {
  const resetStats: UserStats = {
    totalAttempts: 0,
    correctAttempts: 0,
    streak: 0,
    lastUpdated: Date.now(),
  };

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(resetStats));
  } catch (error) {
    console.error('Failed to reset user stats in localStorage:', error);
  }

  return resetStats;
}