/**
 * Guess The Category - Core Game Controller (v2)
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
const inputSection = document.getElementById('input-section');
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
    feedbackEl.textContent = 'Error loading questions. Make sure JSON files exist in /data/';
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
  submitBtn.style.display = 'inline-block';
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
    feedbackEl.textContent = 'No questions available in this level.';
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

// Render only currently revealed clues
function renderClues() {
  cluesContainer.innerHTML = '';
  for (let i = 0; i <= currentClueIndex && i < 5; i++) {
    const card = document.createElement('div');
    card.className = 'clue-card';
    card.innerHTML = `<span class="clue-badge">CLUE ${i + 1}</span><span class="clue-text">${activeQuestion.clues[i]}</span>`;
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
    // Trigger Wiggle Animation on input section
    inputSection.classList.remove('wiggle');
    void inputSection.offsetWidth; // Trigger reflow
    inputSection.classList.add('wiggle');

    feedbackEl.textContent = 'Incorrect guess!';
    feedbackEl.className = 'feedback-error';

    setTimeout(() => {
      inputSection.classList.remove('wiggle');
      currentClueIndex++;
      
      if (currentClueIndex < 5) {
        feedbackEl.textContent = `Clue ${currentClueIndex + 1} revealed!`;
        feedbackEl.className = 'feedback-info';
        renderClues();
        guessInput.value = '';
      } else {
        handleLoss();
      }
    }, 500);
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
  submitBtn.style.display = 'none';
  nextBtn.style.display = 'inline-block';

  // Reveal all 5 clues on win
  currentClueIndex = 4;
  renderClues();

  const clueUsed = currentClueIndex + 1;
  const updatedStats = window.GTCStats.recordWin(currentDifficulty, clueUsed, activeQuestion.id);

  feedbackEl.innerHTML = `🎉 <strong>Correct!</strong> Answer: <strong>${activeQuestion.answer}</strong>. (Streak: ${updatedStats.currentStreak})`;
  feedbackEl.className = 'feedback-success';

  triggerConfetti();
}

// Handle Loss state
function handleLoss() {
  gameOver = true;
  stopTimer();
  guessInput.disabled = true;
  submitBtn.style.display = 'none';
  nextBtn.style.display = 'inline-block';

  const updatedStats = window.GTCStats.recordLoss(currentDifficulty, activeQuestion.id);

  feedbackEl.innerHTML = `❌ <strong>Out of clues!</strong> Correct answer was <strong>${activeQuestion.answer}</strong>.`;
  feedbackEl.className = 'feedback-error';
}

// Timer Logic for Ultra Difficulty with Progressive Red Gradient
function startTimer() {
  timeLeft = 45;
  timerDisplay.classList.remove('timer-solid-red', 'timer-pulsing');
  updateTimerUI();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) {
      stopTimer();
      timerDisplay.classList.remove('timer-pulsing');
      timerDisplay.classList.add('timer-solid-red');
      feedbackEl.innerHTML = `⏰ <strong>Time's up!</strong> Correct answer was <strong>${activeQuestion.answer}</strong>.`;
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
  
  if (timeLeft <= 0) {
    timerDisplay.classList.remove('timer-pulsing');
    timerDisplay.classList.add('timer-solid-red');
    return;
  }

  // Progressive color transition from indigo (t=45) to deep red (t=0)
  const ratio = (45 - timeLeft) / 45; // 0.0 at 45s -> 1.0 at 0s
  
  // Interpolate RGB values:
  // BG: rgb(224, 231, 255) -> rgb(254, 226, 226)
  const bgR = Math.round(224 + (254 - 224) * ratio);
  const bgG = Math.round(231 + (226 - 231) * ratio);
  const bgB = Math.round(255 + (226 - 255) * ratio);
  
  // Text: rgb(55, 48, 163) -> rgb(153, 27, 27)
  const textR = Math.round(55 + (153 - 55) * ratio);
  const textG = Math.round(48 + (27 - 48) * ratio);
  const textB = Math.round(163 + (27 - 163) * ratio);

  timerDisplay.style.backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;
  timerDisplay.style.color = `rgb(${textR}, ${textG}, ${textB})`;
  timerDisplay.style.borderColor = `rgb(${Math.min(255, bgR + 10)}, ${Math.max(0, bgG - 30)}, ${Math.max(0, bgB - 30)})`;

  if (timeLeft <= 10 && timeLeft > 0) {
    timerDisplay.classList.add('timer-pulsing');
  } else {
    timerDisplay.classList.remove('timer-pulsing');
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
