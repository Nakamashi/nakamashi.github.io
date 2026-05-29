/*
  Daily Routine Game
  Static JavaScript only: no backend, build tools, or external libraries.
*/

// ---------- Easy-to-edit game data ----------
// To change the routine cards later, edit this list. Cards stay numbered 1-24, and each card has a fixed point value from 1-5.
const ROUTINE_CARDS = [
  { number: 1, phrase: "eaten breakfast", points: 3 },
  { number: 2, phrase: "eaten lunch", points: 1 },
  { number: 3, phrase: "eaten dinner", points: 5 },
  { number: 4, phrase: "taken a bath", points: 2 },
  { number: 5, phrase: "taken a shower", points: 4 },
  { number: 6, phrase: "gone to school", points: 1 },
  { number: 7, phrase: "left my house", points: 3 },
  { number: 8, phrase: "returned home", points: 5 },
  { number: 9, phrase: "woken up", points: 2 },
  { number: 10, phrase: "gone to bed", points: 4 },
  { number: 11, phrase: "brushed my teeth", points: 1 },
  { number: 12, phrase: "washed my face", points: 5 },
  { number: 13, phrase: "changed my clothes", points: 3 },
  { number: 14, phrase: "packed my bag", points: 2 },
  { number: 15, phrase: "finished my homework", points: 4 },
  { number: 16, phrase: "studied English", points: 1 },
  { number: 17, phrase: "studied math", points: 5 },
  { number: 18, phrase: "read a book", points: 2 },
  { number: 19, phrase: "watched TV", points: 3 },
  { number: 20, phrase: "played a game", points: 4 },
  { number: 21, phrase: "used my phone", points: 1 },
  { number: 22, phrase: "cleaned my room", points: 5 },
  { number: 23, phrase: "gone to club activities", points: 2 },
  { number: 24, phrase: "practiced sports", points: 3 }
];

// ---------- Animation timing constants ----------
// Keep these values easy to edit. The full New Turn sequence is slower and clearer for class play.
const TIME_ROLL_DURATION = 1100;
const COIN_FLIP_DURATION = 900;
const CARD_SHUFFLE_DURATION = 1100;
const QUICK_ANIMATION_DURATION = 450;
const BETWEEN_ANIMATION_PAUSE = 350;

const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const APPEARANCE_STORAGE_KEY = "dailyRoutineGameAppearance";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Page elements ----------
const elements = {
  turnNumber: document.querySelector("#turnNumber"),
  timePanel: document.querySelector("#timePanel"),
  coinPanel: document.querySelector("#coinPanel"),
  cardPanel: document.querySelector("#cardPanel"),
  timeResult: document.querySelector("#timeResult"),
  ampmResult: document.querySelector("#ampmResult"),
  timeModeNote: document.querySelector("#timeModeNote"),
  diceDisplay: document.querySelector("#diceDisplay"),
  firstDie: document.querySelector(".die"),
  secondDie: document.querySelector(".second-die"),
  coin: document.querySelector("#coin"),
  coinText: document.querySelector("#coinText"),
  deck: document.querySelector("#deck"),
  routineCard: document.querySelector("#routineCard"),
  cardNumber: document.querySelector("#cardNumber"),
  routinePhrase: document.querySelector("#routinePhrase"),
  cardPoints: document.querySelector("#cardPoints"),
  deckCount: document.querySelector("#deckCount"),
  sentenceHints: document.querySelector("#sentenceHints"),
  hintYet: document.querySelector("#hintYet"),
  hintAlready: document.querySelector("#hintAlready"),
  hintJust: document.querySelector("#hintJust"),
  thisTurnPoints: document.querySelector("#thisTurnPoints"),
  totalPoints: document.querySelector("#totalPoints"),
  scorePop: document.querySelector("#scorePop"),
  historyCount: document.querySelector("#historyCount"),
  historyList: document.querySelector("#historyList"),
  settingsMenu: document.querySelector("#settingsMenu"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDropdown: document.querySelector("#settingsDropdown"),
  settingsForm: document.querySelector("#settingsForm"),
  buttons: document.querySelectorAll("button"),
  newTurnButton: document.querySelector("#newTurnButton"),
  rollTimeButton: document.querySelector("#rollTimeButton"),
  flipAmpmButton: document.querySelector("#flipAmpmButton"),
  drawCardButton: document.querySelector("#drawCardButton"),
  addPointsButton: document.querySelector("#addPointsButton"),
  resetButton: document.querySelector("#resetButton")
};

const hintData = [
  {
    element: elements.hintYet,
    keyword: "yet",
    buildSentence: (phrase) => `I haven’t ${phrase} yet.`
  },
  {
    element: elements.hintAlready,
    keyword: "already",
    buildSentence: (phrase) => `I have already ${phrase}.`
  },
  {
    element: elements.hintJust,
    keyword: "just",
    buildSentence: (phrase) => `I have just ${phrase}.`
  }
];

// ---------- Game state for this browser session ----------
let state = getFreshState();

function getFreshState() {
  return {
    time: "--:--",
    hour: null,
    minute: "00",
    ampm: "AM/PM",
    card: null,
    thisTurnPoints: 0,
    totalPoints: 0,
    turn: 0,
    history: [],
    deck: [],
    isAnimating: false,
    currentResultSaved: true
  };
}

// ---------- Small helper functions ----------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function shouldAnimate() {
  return getSetting("animations") === "on" && !prefersReducedMotion;
}

function animationTime(duration) {
  return shouldAnimate() ? duration : 0;
}

function getSetting(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setSetting(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) {
    input.checked = true;
  }
}

function setButtonsDisabled(disabled) {
  elements.buttons.forEach((button) => {
    if (button === elements.addPointsButton) {
      return;
    }
    button.disabled = disabled;
  });
  updateAddPointsButton();
}

function setActiveStep(panel, isActive) {
  panel.classList.toggle("active-step", isActive && shouldAnimate());
}

function setSettingsOpen(isOpen) {
  elements.settingsDropdown.hidden = !isOpen;
  elements.settingsButton.setAttribute("aria-expanded", String(isOpen));
}

function formatPoints(points) {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

function getRandomMinute() {
  return getSetting("minuteMode") === "random" ? MINUTES[randomInt(0, MINUTES.length - 1)] : "00";
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ensureDeck() {
  if (state.deck.length === 0) {
    state.deck = shuffleArray(ROUTINE_CARDS);
  }
}

function markCurrentResultChanged() {
  if (state.card) {
    state.currentResultSaved = false;
  }
  updateAddPointsButton();
}

function markCurrentResultSaved() {
  state.currentResultSaved = true;
  updateAddPointsButton();
}

function updateAddPointsButton() {
  elements.addPointsButton.disabled = state.isAnimating || !state.card || state.currentResultSaved;
}

// ---------- Result generation ----------
function generateTimeRoll() {
  const minute = getRandomMinute();

  if (getSetting("timeMode") === "dice") {
    const dieOne = randomInt(1, 6);
    const dieTwo = randomInt(1, 6);
    return {
      hour: dieOne + dieTwo,
      minute,
      dieOne,
      dieTwo,
      note: `Two dice: ${dieOne} + ${dieTwo} = ${dieOne + dieTwo}`
    };
  }

  const hour = randomInt(1, 12);
  return {
    hour,
    minute,
    dieOne: hour,
    dieTwo: null,
    note: "Fair 1–12 time roll"
  };
}

function generateAmpm() {
  return Math.random() < 0.5 ? "AM" : "PM";
}

function generateCard() {
  if (getSetting("cardMode") === "shuffle") {
    ensureDeck();
    return state.deck.pop();
  }

  return ROUTINE_CARDS[randomInt(0, ROUTINE_CARDS.length - 1)];
}

// ---------- Screen update functions ----------
function updateTimeDisplay(roll) {
  state.hour = roll.hour;
  state.minute = roll.minute;
  state.time = `${roll.hour}:${roll.minute}`;
  elements.timeResult.textContent = state.time;
  elements.timeModeNote.textContent = roll.note;
  elements.firstDie.textContent = roll.dieOne;

  if (roll.dieTwo === null) {
    elements.secondDie.classList.add("is-hidden");
    elements.diceDisplay.setAttribute("aria-label", `Fair 1 to 12 roll: ${roll.hour}`);
  } else {
    elements.secondDie.classList.remove("is-hidden");
    elements.secondDie.textContent = roll.dieTwo;
    elements.diceDisplay.setAttribute("aria-label", `Two dice roll: ${roll.dieOne} and ${roll.dieTwo}`);
  }
}

function updateAmpmDisplay(ampm) {
  state.ampm = ampm;
  elements.ampmResult.textContent = ampm;
  elements.coin.textContent = ampm;
  elements.coinText.textContent = `${ampm} selected`;
}

function updateCardDisplay(card) {
  state.card = card;
  state.thisTurnPoints = card.points;
  elements.cardNumber.textContent = `Card ${card.number}`;
  elements.routinePhrase.textContent = card.phrase;
  elements.cardPoints.textContent = formatPoints(card.points);
  elements.thisTurnPoints.textContent = formatPoints(card.points);
  updateSentenceHints(card.phrase);
  updateDeckCount();
}

function updateSentenceHints(phrase) {
  hintData.forEach((hint) => {
    const phraseElement = hint.element.querySelector(".hint-card-phrase");
    phraseElement.textContent = phrase;
    hint.element.dataset.sentence = hint.buildSentence(phrase);
    setHintRevealed(hint.element, false, hint.keyword);
  });
}

function setHintRevealed(button, isRevealed, keyword) {
  button.classList.toggle("is-revealed", isRevealed);
  button.setAttribute("aria-pressed", String(isRevealed));
  button.setAttribute("aria-label", isRevealed ? `Hide ${keyword} hint: ${button.dataset.sentence}` : `Reveal ${keyword} hint`);
}

function updateDeckCount() {
  if (getSetting("cardMode") === "shuffle") {
    elements.deckCount.textContent = `Shuffle deck: ${state.deck.length} of ${ROUTINE_CARDS.length} cards left. No repeats until all cards are used.`;
  } else {
    elements.deckCount.textContent = `Random draw with replacement from ${ROUTINE_CARDS.length} cards`;
  }
}

function updateScoreDisplay() {
  elements.thisTurnPoints.textContent = formatPoints(state.thisTurnPoints);
  elements.totalPoints.textContent = formatPoints(state.totalPoints);
  elements.turnNumber.textContent = `Turn ${state.turn}`;
  updateAddPointsButton();
}

function updateHintsVisibility() {
  elements.sentenceHints.classList.toggle("is-hidden", getSetting("hints") === "off");
}

function applyAppearance() {
  const appearance = getSetting("appearance");
  document.body.classList.toggle("dark-mode", appearance === "dark");
  localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance || "light");
}

function loadSavedAppearance() {
  const savedAppearance = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  if (savedAppearance === "dark" || savedAppearance === "light") {
    setSetting("appearance", savedAppearance);
  }
  applyAppearance();
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  elements.historyCount.textContent = `${state.history.length} ${state.history.length === 1 ? "turn" : "turns"}`;

  if (state.history.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-history";
    empty.textContent = "Previous turns will appear here.";
    elements.historyList.append(empty);
    return;
  }

  state.history.forEach((turn, index) => {
    const item = document.createElement("li");
    if (index === 0) {
      item.classList.add("new-history");
    }
    item.textContent = `Turn ${turn.turn}: ${turn.time} ${turn.ampm}, ${turn.phrase}, ${formatPoints(turn.points)}`;
    elements.historyList.append(item);
  });
}

function addHistoryEntry() {
  state.history.unshift({
    turn: state.turn,
    time: state.time,
    ampm: state.ampm,
    phrase: state.card.phrase,
    points: state.card.points
  });
  renderHistory();
}

function addCurrentPoints() {
  if (!state.card || state.currentResultSaved) {
    return;
  }

  state.turn += 1;
  state.totalPoints += state.card.points;
  state.thisTurnPoints = state.card.points;
  updateScoreDisplay();
  animateScore(state.card.points);
  addHistoryEntry();
  markCurrentResultSaved();
}

function animateScore(points) {
  elements.scorePop.textContent = `+${points}`;
  elements.scorePop.classList.remove("show");
  void elements.scorePop.offsetWidth;
  elements.scorePop.classList.add("show");
}

// ---------- Animated actions ----------
async function rollTime() {
  const duration = animationTime(TIME_ROLL_DURATION);
  setActiveStep(elements.timePanel, true);
  elements.timeResult.classList.add("rolling");
  elements.diceDisplay.classList.add("rolling");

  if (duration > 0) {
    const interval = setInterval(() => {
      const preview = generateTimeRoll();
      updateTimeDisplay(preview);
    }, 90);
    await wait(duration);
    clearInterval(interval);
  }

  const finalRoll = generateTimeRoll();
  updateTimeDisplay(finalRoll);
  elements.timeResult.classList.remove("rolling");
  elements.diceDisplay.classList.remove("rolling");
  setActiveStep(elements.timePanel, false);
}

async function flipAmpm() {
  const duration = animationTime(COIN_FLIP_DURATION);
  setActiveStep(elements.coinPanel, true);
  elements.coin.classList.add("flipping");

  if (duration > 0) {
    const interval = setInterval(() => {
      elements.coin.textContent = generateAmpm();
    }, 100);
    await wait(duration);
    clearInterval(interval);
  }

  updateAmpmDisplay(generateAmpm());
  elements.coin.classList.remove("flipping");
  setActiveStep(elements.coinPanel, false);
}

async function drawRoutineCard() {
  const duration = animationTime(CARD_SHUFFLE_DURATION);
  setActiveStep(elements.cardPanel, true);
  elements.deck.classList.add("shuffling");
  elements.routineCard.classList.remove("revealing");

  if (duration > 0) {
    await wait(duration);
  }

  updateCardDisplay(generateCard());
  elements.deck.classList.remove("shuffling");
  elements.routineCard.classList.add("revealing");

  if (shouldAnimate()) {
    await wait(QUICK_ANIMATION_DURATION);
  }
  elements.routineCard.classList.remove("revealing");
  setActiveStep(elements.cardPanel, false);
}

// ---------- Turn control ----------
async function runSafely(action, options = {}) {
  const { addPointsAfter = false, resultChanges = false } = options;
  if (state.isAnimating) {
    return;
  }

  state.isAnimating = true;
  setSettingsOpen(false);
  setButtonsDisabled(true);

  try {
    await action();
    if (addPointsAfter && state.card) {
      state.turn += 1;
      state.totalPoints += state.card.points;
      state.thisTurnPoints = state.card.points;
      updateScoreDisplay();
      animateScore(state.card.points);
      addHistoryEntry();
      markCurrentResultSaved();
    } else if (resultChanges) {
      markCurrentResultChanged();
    }
  } finally {
    state.isAnimating = false;
    setButtonsDisabled(false);
  }
}

function newTurn() {
  runSafely(async () => {
    await rollTime();
    await wait(BETWEEN_ANIMATION_PAUSE);
    await flipAmpm();
    await wait(BETWEEN_ANIMATION_PAUSE);
    await drawRoutineCard();
    await wait(BETWEEN_ANIMATION_PAUSE);
  }, { addPointsAfter: true });
}

function resetGame() {
  const confirmed = window.confirm("Reset the total points and turn history for this device?");
  if (!confirmed) {
    return;
  }

  state = getFreshState();
  if (getSetting("cardMode") === "shuffle") {
    ensureDeck();
  }

  elements.timeResult.textContent = "--:--";
  elements.ampmResult.textContent = "AM/PM";
  elements.timeModeNote.textContent = "Fair 1–12 time roll";
  elements.firstDie.textContent = "?";
  elements.secondDie.textContent = "?";
  elements.secondDie.classList.add("is-hidden");
  elements.coin.textContent = "?";
  elements.coinText.textContent = "Ready to flip";
  elements.cardNumber.textContent = "Card --";
  elements.routinePhrase.textContent = "Tap New Turn";
  elements.cardPoints.textContent = "-- points";
  updateSentenceHints("_____");
  updateScoreDisplay();
  updateDeckCount();
  renderHistory();
}

// ---------- Event listeners ----------
elements.settingsButton.addEventListener("click", () => {
  setSettingsOpen(elements.settingsDropdown.hidden);
});

document.addEventListener("click", (event) => {
  if (!elements.settingsMenu.contains(event.target)) {
    setSettingsOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setSettingsOpen(false);
  }
});

hintData.forEach((hint) => {
  hint.element.addEventListener("click", () => {
    const nextState = !hint.element.classList.contains("is-revealed");
    setHintRevealed(hint.element, nextState, hint.keyword);
  });
});

elements.newTurnButton.addEventListener("click", newTurn);
elements.rollTimeButton.addEventListener("click", () => runSafely(rollTime, { resultChanges: true }));
elements.flipAmpmButton.addEventListener("click", () => runSafely(flipAmpm, { resultChanges: true }));
elements.drawCardButton.addEventListener("click", () => runSafely(drawRoutineCard, { resultChanges: true }));
elements.addPointsButton.addEventListener("click", addCurrentPoints);
elements.resetButton.addEventListener("click", resetGame);

elements.settingsForm.addEventListener("change", (event) => {
  if (event.target.name === "cardMode") {
    state.deck = [];
    if (getSetting("cardMode") === "shuffle") {
      ensureDeck();
    }
  }
  if (event.target.name === "appearance") {
    applyAppearance();
  }
  updateHintsVisibility();
  updateDeckCount();
});

// ---------- First screen setup ----------
loadSavedAppearance();
ensureDeck();
updateSentenceHints("_____");
updateScoreDisplay();
updateHintsVisibility();
updateDeckCount();
renderHistory();
