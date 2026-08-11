/**
 * Guess The Category - Stats Manager (localStorage Persistence)
 */

const STATS_KEY = 'gtc_game_stats_v2';

const defaultStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  difficultyStats: {
    easy: { played: 0, wins: 0 },
    medium: { played: 0, wins: 0 },
    hard: { played: 0, wins: 0 },
    ultra: { played: 0, wins: 0 }
  },
  playedQuestionIds: []
};

// Load stats from localStorage
function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...defaultStats };
    const parsed = JSON.parse(raw);
    return { ...defaultStats, ...parsed };
  } catch (e) {
    console.error('Failed to load stats from localStorage:', e);
    return { ...defaultStats };
  }
}

// Save stats to localStorage
function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats to localStorage:', e);
  }
}

// Record a Win
function recordWin(difficulty, clueNumber, questionId) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.wins += 1;
  stats.currentStreak += 1;
  if (stats.currentStreak > stats.maxStreak) {
    stats.maxStreak = stats.currentStreak;
  }
  
  if (clueNumber >= 1 && clueNumber <= 5) {
    stats.guessDistribution[clueNumber] = (stats.guessDistribution[clueNumber] || 0) + 1;
  }

  if (stats.difficultyStats[difficulty]) {
    stats.difficultyStats[difficulty].played += 1;
    stats.difficultyStats[difficulty].wins += 1;
  }

  if (questionId && !stats.playedQuestionIds.includes(questionId)) {
    stats.playedQuestionIds.push(questionId);
  }

  saveStats(stats);
  return stats;
}

// Record a Loss
function recordLoss(difficulty, questionId) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.losses += 1;
  stats.currentStreak = 0;

  if (stats.difficultyStats[difficulty]) {
    stats.difficultyStats[difficulty].played += 1;
  }

  if (questionId && !stats.playedQuestionIds.includes(questionId)) {
    stats.playedQuestionIds.push(questionId);
  }

  saveStats(stats);
  return stats;
}

// Check if question has been played recently
function isQuestionPlayed(questionId) {
  const stats = loadStats();
  return stats.playedQuestionIds.includes(questionId);
}

// Clear played question history for a given difficulty or reset entirely
function clearPlayedHistory() {
  const stats = loadStats();
  stats.playedQuestionIds = [];
  saveStats(stats);
}

// Reset all stats
function resetStats() {
  saveStats({ ...defaultStats });
}

// Render stats inside Modal UI
function renderStatsModal() {
  const stats = loadStats();
  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.wins / stats.gamesPlayed) * 100) 
    : 0;

  document.getElementById('stat-played').textContent = stats.gamesPlayed;
  document.getElementById('stat-win-rate').textContent = `${winRate}%`;
  document.getElementById('stat-streak').textContent = stats.currentStreak;
  document.getElementById('stat-max-streak').textContent = stats.maxStreak;

  // Render guess distribution bar graph
  const maxGuesses = Math.max(1, ...Object.values(stats.guessDistribution));
  for (let i = 1; i <= 5; i++) {
    const count = stats.guessDistribution[i] || 0;
    const pct = Math.max(8, Math.round((count / maxGuesses) * 100));
    const barEl = document.getElementById(`dist-bar-${i}`);
    const countEl = document.getElementById(`dist-count-${i}`);
    if (barEl && countEl) {
      barEl.style.width = `${pct}%`;
      countEl.textContent = count;
      if (count > 0) {
        barEl.classList.add('active');
      } else {
        barEl.classList.remove('active');
      }
    }
  }
}

// Export functions for app.js
window.GTCStats = {
  loadStats,
  recordWin,
  recordLoss,
  isQuestionPlayed,
  clearPlayedHistory,
  resetStats,
  renderStatsModal
};
