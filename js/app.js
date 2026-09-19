const SCREENS = ["intro", "home", "why", "manifesto", "howto", "verdict"];

const PROCEDURES = {
  mushrooms:
    "Toss frozen mushrooms in a scorching pan. No oil, no water. Let them sweat. Drain and discard the bitter water. Put them back on the heat with oil, black pepper, and salted garlic. Finish cooking.",
  eggs: "Boil water in a small pot. Drop the two eggs in. Exactly 8 minutes. Not a second more, not a second less. Take them out and run under cold water to stop the cooking. Peel them.",
  meat: "Slice the meat into thin strips. Boil water in a large pot and drop the stock cube in. Once dissolved, throw the raw meat directly into the boiling broth. It cooks instantly.",
  noodles:
    "Right after the meat, drop your noodles and the previously cooked mushrooms into the broth. Let it all cook together. Don't overthink it, just check the texture.",
  scallion:
    'Turn off the heat and pour everything into a bowl. Slice the scallion into rounds and throw it on top raw. Add the halved eggs and the teriyaki sauce.\nSay <button type="button" class="text-btn procedure-verdict" data-go="verdict">VERDICT</button> to close the case.',
};

const INGREDIENT_ALIASES = {
  mushroom: "mushrooms",
  mushrooms: "mushrooms",
  eggs: "eggs",
  egg: "eggs",
  uova: "eggs",
  uovo: "eggs",
  uove: "eggs",
  meat: "meat",
  noodle: "noodles",
  noodles: "noodles",
  scallion: "scallion",
  scallions: "scallion",
  "spring onion": "scallion",
  "green onion": "scallion",
};

const HERO = {
  mushrooms: "assets/w3-mushrooms.png?v=hero5",
  eggs: "assets/w3-eggs.png?v=hero5",
  meat: "assets/w3-meat.png?v=hero5",
  noodles: "assets/w3-noodles.png?v=hero5",
  scallion: "assets/w3-scallion.png?v=hero5",
};

const LETTERBOX = {
  intro: "#000000",
  home: "#000000",
  why: "#b9000b",
  manifesto: "#b9000b",
  howto: "#223766",
  verdict: "#b9000b",
};

const QUIZ = [
  {
    title: "Step 1: Post-Meal Energy",
    correct: "a",
    a: "Clean energy: carbs, protein, and greens in every bite.",
    b: "Food coma from plain carbs.",
  },
  {
    title: "Step 2: Flavor Connection",
    correct: "a",
    a: "Rich broth that connects everything.",
    b: "Separate ingredients drowned in oil to taste good.",
  },
  {
    title: "Step 3: The Dining Flow",
    correct: "a",
    a: "Steaming hot from start to finish, effortless to eat.",
    b: "Food getting cold halfway through.",
  },
  {
    title: "Step 4: Table Setup",
    correct: "b",
    a: "Table covered in plates and endless dishes to wash.",
    b: "One bowl, two chopsticks, one spoon. Done.",
  },
  {
    title: "Step 5: Lifestyle",
    correct: "b",
    a: "Three-course ritual: two wasted hours.",
    b: "One bowl: eat, fuel up, move on.",
  },
];

const procedureEl = document.getElementById("procedure");
const quizProgressEl = document.getElementById("quiz-progress");
const quizChoiceA = document.getElementById("quiz-choice-a");
const quizChoiceB = document.getElementById("quiz-choice-b");
const matchCopyEl = document.getElementById("match-copy");
const screens = Object.fromEntries(
  SCREENS.map((name) => [name, document.getElementById(`screen-${name}`)])
);

let currentScreen = "intro";
let transitioning = false;
let pendingGo = null;
let currentIngredient = "mushrooms";
let quizStep = 0;
let quizAnswers = [];
let quizLocked = false;
let recognition = null;
let hearing = false;
let lastCommand = "";
let lastCommandAt = 0;
let verdictTimers = [];
let manifestoTimers = [];

function fitType() {
  document.documentElement.style.setProperty(
    "--recipe-scale",
    String(Math.max(0.85, window.innerHeight / 800))
  );
  syncWhyLayout();
  syncHowtoLayout();
  syncManifestoLayout();
}

function syncWhyLayout() {
  const title = document.querySelector("#screen-why .page-title");
  if (!title || screens.why.hidden) return;
  const box = title.getBoundingClientRect();
  document.documentElement.style.setProperty("--quiz-left", `${Math.round(box.right)}px`);
}

function syncHowtoLayout() {
  const dash = document.querySelector("#screen-howto .howto-dash");
  const rule = document.querySelector(".recipe-ing .recipe-rule");
  const recipe = document.querySelector(".recipe");
  if (!dash || !rule || !recipe || screens.howto.hidden) return;
  const width = dash.getBoundingClientRect().right - recipe.getBoundingClientRect().left;
  rule.style.width = `${Math.max(0, Math.round(width))}px`;
}

function syncManifestoLayout() {
  const take = document.querySelector(".manifesto-take");
  const copy = document.querySelector(".take-copy");
  const card = document.querySelector(".manifesto-card");
  const svg = document.querySelector(".take-pointer");
  const path = svg && svg.querySelector("path");
  if (!take || !copy || !card || !svg || !path || screens.manifesto.hidden) return;

  const takeBox = take.getBoundingClientRect();
  const copyBox = copy.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const h = takeBox.height;
  if (h < 2) return;

  const lineRight = cardBox.left - takeBox.left - 32;
  const w = Math.max(takeBox.width, lineRight);
  if (w < 2 || lineRight < 2) return;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.width = `${w}px`;
  svg.style.height = `${h}px`;

  const hLen = 32 * 2;
  const ax = lineRight - hLen;
  const ay = h - 32;
  const topX = copyBox.left - takeBox.left + copyBox.width / 2;
  const topY = copyBox.bottom - takeBox.top + 32;

  path.setAttribute(
    "d",
    `M ${topX.toFixed(1)} ${topY.toFixed(1)} L ${ax.toFixed(1)} ${ay.toFixed(1)} H ${lineRight.toFixed(1)}`
  );
}

function setIngredient(id) {
  if (!PROCEDURES[id]) return;
  currentIngredient = id;
  if (id === "scallion") procedureEl.innerHTML = PROCEDURES[id];
  else procedureEl.textContent = PROCEDURES[id];
  document.querySelectorAll(".ingredient").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.ingredient === id);
  });
  const hero = document.querySelector(".recipe-hero");
  if (hero && HERO[id]) {
    hero.src = HERO[id];
    hero.dataset.hero = id;
  }
}

function resetQuiz() {
  quizStep = 0;
  quizAnswers = [];
  quizLocked = false;
  renderQuizStep();
}

function quizComplete() {
  return quizAnswers.length === QUIZ.length;
}

function quizPercent() {
  const hits = quizAnswers.filter((choice, i) => choice === QUIZ[i].correct).length;
  return Math.round((hits / QUIZ.length) * 100);
}

function renderQuizStep() {
  const step = QUIZ[quizStep];
  if (!step) return;
  quizProgressEl.textContent = `${quizStep + 1}/${QUIZ.length}`;
  quizChoiceA.textContent = step.a;
  quizChoiceB.textContent = step.b;
  quizChoiceA.classList.remove("is-selected");
  quizChoiceB.classList.remove("is-selected");
}

function matchCopy(percent) {
  return `<strong>WE MATCH<br />${percent}%.</strong>`;
}

function resetManifesto() {
  manifestoTimers.forEach((id) => window.clearTimeout(id));
  manifestoTimers = [];
  document.querySelectorAll(".match-copy, .manifesto-take, .manifesto-card").forEach((el) => {
    el.classList.remove("is-on");
  });
}

function playManifesto() {
  resetManifesto();
  const beats = [
    document.querySelector(".match-copy"),
    document.querySelector(".manifesto-take"),
    document.querySelector(".manifesto-card"),
  ].filter(Boolean);
  let delay = 220;
  beats.forEach((el) => {
    manifestoTimers.push(
      window.setTimeout(() => {
        el.classList.add("is-on");
      }, delay)
    );
    delay += 780;
  });
}

function showManifesto() {
  matchCopyEl.innerHTML = matchCopy(quizPercent());
  go("manifesto");
}

function selectChoice(choice) {
  if (quizLocked || currentScreen !== "why") return;
  quizLocked = true;
  quizAnswers[quizStep] = choice;
  quizChoiceA.classList.toggle("is-selected", choice === "a");
  quizChoiceB.classList.toggle("is-selected", choice === "b");

  window.setTimeout(() => {
    if (quizStep >= QUIZ.length - 1) {
      showManifesto();
      return;
    }
    quizStep += 1;
    quizLocked = false;
    renderQuizStep();
  }, 280);
}

function resetVerdict() {
  verdictTimers.forEach((id) => window.clearTimeout(id));
  verdictTimers = [];
  document.querySelectorAll(".verdict-line").forEach((el) => el.classList.remove("is-on"));
}

function playVerdict() {
  resetVerdict();
  const lines = [...document.querySelectorAll(".verdict-line")];
  let delay = 220;
  lines.forEach((el) => {
    verdictTimers.push(
      window.setTimeout(() => {
        el.classList.add("is-on");
      }, delay)
    );
    delay += el.dataset.beat === "1" ? 1200 : 780;
  });
}

function go(screen) {
  if (!screens[screen]) return;
  if (transitioning) {
    pendingGo = screen;
    return;
  }
  if (screen === currentScreen) return;
  if (currentScreen === "why" && screen !== "manifesto") resetQuiz();
  if (screen === "why") resetQuiz();

  const from = currentScreen;
  const to = screen;
  const kind = transitionKind(from, to);
  const outEl = screens[from];
  const inEl = screens[to];
  const duration = kind === "fade" ? 480 : 800;

  transitioning = true;
  document.body.classList.add("is-transitioning");
  document.body.style.background = LETTERBOX[to];

  outEl.classList.add("is-leave");
  outEl.style.transition = "none";
  outEl.style.transform = "translate3d(0, 0, 0)";
  outEl.style.opacity = "1";

  inEl.style.transition = "none";
  inEl.style.transform = "translate3d(0, 0, 0)";
  inEl.style.opacity = "1";
  inEl.classList.add("is-under");
  inEl.hidden = false;
  inEl.removeAttribute("aria-hidden");

  if (from === "verdict") resetVerdict();
  if (from === "manifesto") resetManifesto();
  if (to === "howto") {
    setIngredient(currentIngredient);
    requestAnimationFrame(syncHowtoLayout);
  }
  if (to === "why") requestAnimationFrame(syncWhyLayout);
  if (to === "manifesto") {
    resetManifesto();
    requestAnimationFrame(syncManifestoLayout);
    manifestoTimers.push(window.setTimeout(playManifesto, duration));
  }
  if (to === "verdict") {
    resetVerdict();
    verdictTimers.push(window.setTimeout(playVerdict, duration));
  }

  const move = {
    right: "translate3d(100%, 0, 0)",
    left: "translate3d(-100%, 0, 0)",
    up: "translate3d(0, -100%, 0)",
    down: "translate3d(0, 100%, 0)",
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (kind === "fade") {
        outEl.style.transition = `opacity ${duration}ms ease`;
        outEl.style.opacity = "0";
        return;
      }
      outEl.style.transition = `transform ${duration}ms cubic-bezier(0.77, 0, 0.18, 1)`;
      outEl.style.transform = move[kind];
    });
  });

  let done = false;
  function finish() {
    if (done) return;
    done = true;
    outEl.hidden = true;
    outEl.setAttribute("aria-hidden", "true");
    outEl.classList.remove("is-leave");
    outEl.style.transition = "";
    outEl.style.transform = "";
    outEl.style.opacity = "";
    inEl.classList.remove("is-under");
    inEl.style.transition = "";
    inEl.style.transform = "";
    inEl.style.opacity = "";
    currentScreen = to;
    transitioning = false;
    document.body.classList.remove("is-transitioning");
    fitType();
    const next = pendingGo;
    pendingGo = null;
    if (next && next !== currentScreen) go(next);
  }

  outEl.addEventListener(
    "transitionend",
    (event) => {
      if (event.target === outEl) finish();
    },
    { once: true }
  );
  window.setTimeout(finish, duration + 80);
}

function transitionKind(from, to) {
  const map = {
    "home:why": "right",
    "why:home": "left",
    "intro:why": "right",
    "home:howto": "left",
    "howto:home": "right",
    "intro:howto": "left",
    "why:manifesto": "up",
    "manifesto:why": "down",
    "intro:home": "fade",
    "home:intro": "fade",
    "howto:why": "right",
    "why:howto": "left",
    "manifesto:home": "left",
    "manifesto:howto": "left",
    "howto:manifesto": "up",
    "howto:verdict": "up",
    "verdict:howto": "down",
    "verdict:home": "left",
  };
  return map[`${from}:${to}`] || "fade";
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function remember(text) {
  lastCommand = text;
  lastCommandAt = Date.now();
}

function findIngredient(text) {
  for (const [alias, id] of Object.entries(INGREDIENT_ALIASES)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    if (new RegExp(`\\b${escaped}\\b`).test(text)) return id;
  }
  if (/\beggs?\b|\buov[aeo]\b/.test(text)) return "eggs";
  return null;
}

function handleCommand(raw) {
  const text = normalize(raw);
  if (!text) return false;
  if (text === lastCommand && Date.now() - lastCommandAt < 900) return true;

  if (/\blet'?s go\b|\blets go\b|\blet us go\b/.test(text)) {
    remember(text);
    go("home");
    return true;
  }
  if (/\bhow\s*to\b/.test(text)) {
    remember(text);
    go("howto");
    return true;
  }
  if (/\bwhy\b/.test(text)) {
    remember(text);
    go("why");
    return true;
  }
  if (/\bverdict\b/.test(text)) {
    remember(text);
    go("verdict");
    return true;
  }
  if (/\bmanifesto\b/.test(text) && quizComplete()) {
    remember(text);
    go("manifesto");
    return true;
  }
  if (/\bback\b/.test(text)) {
    remember(text);
    if (currentScreen === "manifesto") go("why");
    else if (currentScreen === "verdict") go("howto");
    else if (currentScreen === "why" || currentScreen === "howto") go("home");
    else if (currentScreen === "home") go("intro");
    return true;
  }

  const ingredientId = findIngredient(text);
  if (ingredientId) {
    remember(text);
    if (currentScreen !== "howto") go("howto");
    setIngredient(ingredientId);
    return true;
  }

  return false;
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  if (recognition) {
    hearing = true;
    try {
      recognition.start();
    } catch {
      /* already running */
    }
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 4;
  recognition.lang = "en-US";
  hearing = true;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result.isFinal) continue;
      for (let j = 0; j < result.length; j += 1) {
        if (handleCommand(result[j].transcript)) break;
      }
    }
  };

  recognition.onend = () => {
    if (!hearing) return;
    window.setTimeout(() => {
      try {
        recognition.start();
      } catch {
        /* already started */
      }
    }, 120);
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      hearing = false;
    }
  };

  try {
    recognition.start();
  } catch {
    /* already started */
  }
}

document.addEventListener("click", (event) => {
  const goBtn = event.target.closest("[data-go]");
  if (goBtn) go(goBtn.dataset.go);

  const choiceBtn = event.target.closest(".quiz-choice");
  if (choiceBtn) selectChoice(choiceBtn.dataset.choice);

  const ingredientBtn = event.target.closest("[data-ingredient]");
  if (ingredientBtn) setIngredient(ingredientBtn.dataset.ingredient);

  startVoice();
});

window.addEventListener("resize", fitType);
fitType();
setIngredient("mushrooms");
renderQuizStep();
document.body.style.background = LETTERBOX.intro;
Object.entries(screens).forEach(([name, el]) => {
  if (name !== "intro") el.setAttribute("aria-hidden", "true");
});
startVoice();
document.title = "ramen";
