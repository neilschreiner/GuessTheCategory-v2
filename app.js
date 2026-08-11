/**
 * Guess The Category - Core Game Logic & Controller
 */

let currentQuestions = [];
let activeQuestion = null;
let currentClueIndex = 0;
let currentDifficulty = 'easy';
let timerInterval = null;
let timeLeft = 45;
let gameOver = false;

// DOM Elements
const difficultySelect = document.getElementById('difficulty-select');
const cluesContainer = document.getElementById('clues-container');
const guessInput = document.getElementById('guess-input');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const feedbackEl = document.getElementById('feedback');
const timerDisplay = document.getElementById('timer-display');
const statsModal = document.getElementById('stats-modal');
const openStatsBtn = document.getElementById('open-stats-btn');
const closeStatsBtn = document.getElementById('close-stats-btn');
const resetStatsBtn = document.getElementById('reset-stats-btn');

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadCategoryData(currentDifficulty);
});

function initEventListeners() {
  difficultySelect.addEventListener('change', (e) => {
    currentDifficulty = e.target.value;
    loadCategoryData(currentDifficulty);
  });

  submitBtn.addEventListener('click', handleGuessSubmit);
  
  guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGuessSubmit();
  });

  nextBtn.addEventListener('click', startNewRound);

  openStatsBtn.addEventListener('click', () => {
    window.GTCStats.renderStatsModal();
    statsModal.classList.add('show');
  });

  closeStatsBtn.addEventListener('click', () => {
    statsModal.classList.remove('show');
  });

  resetStatsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all your stats? This cannot be undone.')) {
      window.GTCStats.resetStats();
      window.GTCStats.renderStatsModal();
    }
  });

  // Close modal on background click
  window.addEventListener('click', (e) => {
    if (e.target === statsModal) {
      statsModal.classList.remove('show');
    }
  });
}

// Fetch JSON data for current difficulty
async function loadCategoryData(difficulty) {
  try {
    feedbackEl.textContent = 'Loading questions...';
    feedbackEl.className = 'feedback-info';
    
    const response = await fetch(`data/${difficulty}.json`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    currentQuestions = await response.json();
    startNewRound();
  } catch (err) {
    console.error('Failed to load question database:', err);
    feedbackEl.textContent = 'Error loading questions. Make sure JSON files are in /data/';
    feedbackEl.className = 'feedback-error';
  }
}

// Start a new game round
function startNewRound() {
  stopTimer();
  gameOver = false;
  currentClueIndex = 0;
  guessInput.value = '';
  guessInput.disabled = false;
  submitBtn.disabled = false;
  nextBtn.style.display = 'none';
  feedbackEl.textContent = '';
  feedbackEl.className = '';

  // Filter unplayed questions
  let available = currentQuestions.filter(q => !window.GTCStats.isQuestionPlayed(q.id));
  
  // Reset if all played
  if (available.length === 0 && currentQuestions.length > 0) {
    window.GTCStats.clearPlayedHistory();
    available = currentQuestions;
  }

  if (available.length === 0) {
    feedbackEl.textContent = 'No questions available in this category.';
    return;
  }

  // Pick random question
  const randomIndex = Math.floor(Math.random() * available.length);
  activeQuestion = available[randomIndex];

  renderClues();

  // Setup Ultra Difficulty Timer
  if (currentDifficulty === 'ultra') {
    timerDisplay.style.display = 'block';
    startTimer();
  } else {
    timerDisplay.style.display = 'none';
  }
}

// Render clues list
function renderClues() {
  cluesContainer.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const card = document.createElement('div');
    card.className = 'clue-card';
    
    if (i <= currentClueIndex) {
      card.classList.add('revealed');
      card.innerHTML = `<span class="clue-num">Clue ${i + 1}:</span> ${activeQuestion.clues[i]}`;
    } else {
      card.classList.add('locked');
      card.innerHTML = `<span class="clue-num">Clue ${i + 1}:</span> 🔒 Locked`;
    }
    
    cluesContainer.appendChild(card);
  }
}

// Handle guess submission
function handleGuessSubmit() {
  if (gameOver || !activeQuestion) return;

  const userGuess = guessInput.value.trim();
  if (!userGuess) {
    feedbackEl.textContent = 'Please enter a guess!';
    feedbackEl.className = 'feedback-warning';
    return;
  }

  const isCorrect = checkAnswer(userGuess, activeQuestion);

  if (isCorrect) {
    handleWin();
  } else {
    currentClueIndex++;
    if (currentClueIndex < 5) {
      feedbackEl.textContent = `Incorrect guess. Revealing Clue ${currentClueIndex + 1}!`;
      feedbackEl.className = 'feedback-error';
      renderClues();
      guessInput.value = '';
    } else {
      handleLoss();
    }
  }
}

// Fuzzy string matching
function normalizeString(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function checkAnswer(guess, questionObj) {
  const normGuess = normalizeString(guess);
  const normAnswer = normalizeString(questionObj.answer);

  if (normGuess === normAnswer) return true;

  if (questionObj.acceptableAnswers) {
    return questionObj.acceptableAnswers.some(ans => normalizeString(ans) === normGuess);
  }

  return false;
}

// Handle Win state
function handleWin() {
  gameOver = true;
  stopTimer();
  guessInput.disabled = true;
  submitBtn.disabled = true;
  nextBtn.style.display = 'inline-block';

  // Reveal all clues
  currentClueIndex = 4;
  renderClues();

  const clueUsed = currentClueIndex + 1;
  const updatedStats = window.GTCStats.recordWin(currentDifficulty, clueUsed, activeQuestion.id);

  feedbackEl.innerHTML = `🎉 <strong>Correct!</strong> The answer was <strong>${activeQuestion.answer}</strong>.<br>Current Streak: <strong>${updatedStats.currentStreak}</strong>!`;
  feedbackEl.className = 'feedback-success';

  triggerConfetti();
}

// Handle Loss state
function handleLoss() {
  gameOver = true;
  stopTimer();
  guessInput.disabled = true;
  submitBtn.disabled = true;
  nextBtn.style.display = 'inline-block';

  const updatedStats = window.GTCStats.recordLoss(currentDifficulty, activeQuestion.id);

  feedbackEl.innerHTML = `❌ <strong>Out of clues!</strong> The correct answer was <strong>${activeQuestion.answer}</strong>.`;
  feedbackEl.className = 'feedback-error';
}

// Timer Logic for Ultra Difficulty
function startTimer() {
  timeLeft = 45;
  updateTimerUI();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) {
      stopTimer();
      feedbackEl.innerHTML = `⏰ <strong>Time's up!</strong> The correct answer was <strong>${activeQuestion.answer}</strong>.`;
      feedbackEl.className = 'feedback-error';
      handleLoss();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  timerDisplay.textContent = `⏱ Time Remaining: ${timeLeft}s`;
  if (timeLeft <= 10) {
    timerDisplay.classList.add('urgent');
  } else {
    timerDisplay.classList.remove('urgent');
  }
}

// Celebration Confetti
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}
