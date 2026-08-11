# Guess The Category v2

An evolved, modular edition of **Guess The Category**.

## Features

- **Win/Loss & Streak Tracking (#1 Option A):** Persists games played, win rate, current streak, max streak, and guess distribution by clue number using `localStorage`.
- **Decoupled JSON Question Database (#2):** Questions are organized in modular JSON files (`/data/easy.json`, `/data/medium.json`, `/data/hard.json`, `/data/ultra.json`), easily expandable without modifying core game logic.
- **Fuzzy Answer Matching:** Normalizes user input for casing, punctuation, and alternate acceptable answers.
- **Ultra Difficulty Challenge:** 45-second timer challenge for advanced gameplay.

## How to Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g., `GuessTheCategory-v2`).
2. Push these project files to the `main` branch.
3. In GitHub, navigate to **Settings > Pages**.
4. Set **Source** to `Deploy from a branch` and select `main` / `/ (root)`.
5. Save, and your live game will be accessible via `https://<username>.github.io/<repository-name>/`.
