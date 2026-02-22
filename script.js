// Stable offline paged quiz (50 items)
// - No scrolling (fixed viewport)
// - Debounced buttons (prevents double-trigger)
// - Case-insensitive + space-insensitive + punctuation-lite checking
// - Wrong: must type correct answer to proceed OR Skip (counts wrong)

const RAW = [
  { id: 1, q: "The process of defining tables, attributes, keys, and constraints before storing data.", a: ["Schema"] },
  { id: 2, q: "The structure that serves as the blueprint of a database.", a: ["Schema"] },
  { id: 3, q: "The language used to manage and query databases.", a: ["SQL"] },
  { id: 4, q: "The stage described as building the foundation of a database.", a: ["Schema"] },
  { id: 5, q: "The website where SQLite can be downloaded.", a: ["sqlite.org"] },
  { id: 6, q: "The keyboard shortcut used to open the Run dialog box in Windows.", a: ["Windows + R", "Win + R"] },
  { id: 7, q: "The command typed after pressing Windows + R to open Command Prompt.", a: ["cmd"] },
  { id: 8, q: "The command used in Command Prompt to change directories.", a: ["cd"] },
  { id: 9, q: "The SQLite command used to create and open a database file.", a: [".open"] },
  { id: 10, q: "The name of the database file created in the example.", a: ["school.db"] },
  { id: 11, q: "The SQL command used to create a new table.", a: ["CREATE TABLE"] },
  { id: 12, q: "The SQL command used to add records into a table.", a: ["INSERT"] },
  { id: 13, q: "The SQL command used to retrieve data from a table.", a: ["SELECT"] },
  { id: 14, q: "The SQL command used to modify existing records.", a: ["UPDATE"] },
  { id: 15, q: "The SQL command used to remove specific records from a table.", a: ["DELETE"] },
  { id: 16, q: "The SQL command used to remove an entire table including its structure.", a: ["DROP TABLE"] },
  { id: 17, q: "The keyword used to ensure each value in a column is unique.", a: ["PRIMARY KEY"] },
  { id: 18, q: "The data type used to store whole numbers.", a: ["INT"] },
  { id: 19, q: "The data type used to store names or character values.", a: ["TEXT"] },
  { id: 20, q: "The symbol used in SELECT to display all columns.", a: ["*"] },
  { id: 21, q: "The name of the table created in the example.", a: ["STUDENT"] },
  { id: 22, q: "The column that uniquely identifies each student.", a: ["ROLL_NO"] },
  { id: 23, q: "The SQL statement used to display all records from the STUDENT table.", a: ["SELECT * FROM STUDENT", "SELECT * FROM STUDENT;"] },
  { id: 24, q: "The SQL command compared to designing a form before filling it out.", a: ["CREATE TABLE"] },
  { id: 25, q: "The SQL command compared to asking the database a question.", a: ["SELECT"] },
  { id: 26, q: "The SQL command compared to erasing a row from your table.", a: ["DELETE"] },
  { id: 27, q: "The SQL command compared to throwing away the whole form and all the answers.", a: ["DROP TABLE"] },
  { id: 28, q: "The example name inserted as the first record.", a: ["Alice"] },
  { id: 29, q: "The example name inserted as the second record.", a: ["Bob"] },
  { id: 30, q: "The example age of Alice.", a: ["20"] },
  { id: 31, q: "The example age of Bob.", a: ["22"] },
  { id: 32, q: "The clause used when inserting values into a table.", a: ["INTO"] },
  { id: 33, q: "The SQLite prompt symbol displayed before typing commands.", a: ["sqlite>", "sqlite >"] },
  { id: 34, q: "The file extension of SQLite database files.", a: [".db", "db"] },
  { id: 35, q: "The SQL command that changes existing data in a table.", a: ["UPDATE"] },
  { id: 36, q: "The SQL command that deletes the student with roll number 1.", a: ["DELETE"] },
  { id: 37, q: "The action described as reading data back from the database.", a: ["SELECT"] },
  { id: 38, q: "The action performed after downloading SQLite before using it.", a: ["Extract", "Extraction", "Extracting"] },
  { id: 39, q: "The SQL keyword used after CREATE when making a table.", a: ["TABLE"] },
  { id: 40, q: "The keyword used before specifying values when inserting data.", a: ["INTO"] },
  { id: 41, q: "The name of the column used to store student names.", a: ["NAME"] },
  { id: 42, q: "The name of the column used to store student ages.", a: ["AGE"] },
  { id: 43, q: "The type of constraint applied to ROLL_NO.", a: ["PRIMARY KEY"] },
  { id: 44, q: "The action that permanently deletes both structure and data.", a: ["DROP TABLE"] },
  { id: 45, q: "The example database used for storing student information.", a: ["school.db"] },
  { id: 46, q: "The SQL clause that specifies the table name in SELECT statements.", a: ["FROM"] },
  { id: 47, q: "The SQL command that removes data based on a condition.", a: ["DELETE"] },
  { id: 48, q: "The operation that modifies existing rows in a table.", a: ["UPDATE"] },
  { id: 49, q: "The operation that adds new rows into a table.", a: ["INSERT"] },
  { id: 50, q: "The operation that retrieves information from a database.", a: ["SELECT"] }
];

const LS_KEY = "quizgen_custom_questions_v1";
const LS_LABEL = "quizgen_custom_label_v1";

function saveCustomQuestions(questions, label) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(questions));
    localStorage.setItem(LS_LABEL, label || "QUIZGEN (CSV)");
  } catch (e) {
    console.error(e);
  }
}

function loadCustomQuestions() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const questions = JSON.parse(raw);
    if (!Array.isArray(questions) || !questions.length) return null;
    return { questions, label: localStorage.getItem(LS_LABEL) || "QUIZGEN (CSV)" };
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Randomize each load
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Normalize: lower, remove spaces, remove most punctuation
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9%']/g, "");
}

let Q = shuffle(RAW);

function setQuestionSet(arr, label){
  Q = shuffle(arr);
  idx = 0;
  score = 0;
  lock = false;
  log.length = 0;
  // reset UI
  document.body.classList.add('locked');
  document.body.classList.remove('unlocked');
  res.classList.add('hidden');
  scoreEl.textContent = '';
  if (label) {
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = "QUIZGEN";
    document.title = label || "QUIZGEN";
  }
  qTotal.textContent = Q.length;
  render();
}


document.body.classList.add("locked");

let idx = 0;
let score = 0;
let lock = false;

// log entries: {id, question, userAnswer, correctAnswer, status}
const log = [];

const qNum = document.getElementById("qNum");
const qTotal = document.getElementById("qTotal");
const qText = document.getElementById("qText");
const ans = document.getElementById("answer");
const fb = document.getElementById("feedback");
const mini = document.getElementById("mini");
const skipBtn = document.getElementById("skip");
const checkBtn = document.getElementById("check");

const res = document.getElementById("result");
const scoreEl = document.getElementById("score");
qTotal.textContent = Q.length;

function setFeedback(kind, html) {
  fb.classList.remove("hidden", "ok", "bad");
  fb.classList.add(kind);
  fb.innerHTML = html;
}
function clearFeedback() {
  fb.classList.add("hidden");
  fb.classList.remove("ok", "bad");
  fb.innerHTML = "";
}

function isCorrect(user, accepted) {
  const u = norm(user);
  if (!u) return false;
  return accepted.map(norm).includes(u);
}

function render() {
  lock = false;
  clearFeedback();
  ans.value = "";
  qNum.textContent = String(idx + 1);
  qText.textContent = Q[idx].q;
  mini.textContent = `Correct so far: ${score}/${Q.length}`;
  setTimeout(() => ans.focus(), 0);
}

function next() {
  idx++;
  if (idx < Q.length) {
    render();
  } else {
    finish();
  }
}

function record(status, userAnswer) {
  log.push({
    id: Q[idx].id,
    question: Q[idx].q,
    userAnswer: userAnswer || "",
    correctAnswer: Q[idx].a[0],
    status
  });
}

checkBtn.addEventListener("click", () => {
  if (lock) return;
  lock = true;

  const user = ans.value;
  const ok = isCorrect(user, Q[idx].a);

  if (ok) {
    score++;
    record("Correct", user);
    next();
  } else {
    setFeedback("bad", `Wrong. <b>Correct answer:</b> ${Q[idx].a[0]}<br>Type the correct answer to continue, or click <b>Skip</b>.`);
    lock = false;
  }
});

skipBtn.addEventListener("click", () => {
  if (lock) return;
  lock = true;
  record("Wrong / Skipped", ans.value);
  next();
});

// Enter key = Check
ans.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    checkBtn.click();
  }
});

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function finish(){
  res.classList.remove("hidden");

  const total = Q.length;
  const correct = score;
  const mistakes = total - correct;

  scoreEl.textContent = `Score: ${correct}/${total}`;
  if (mistakesEl) mistakesEl.textContent = `Mistake: ${mistakes}`;
  if (correctEl) correctEl.textContent = `Correct: ${correct}`;
}

// XLSX Import wiring (no dependencies)
(() => {
  const fileEl = document.getElementById("quizFile");
  const loadBtn = document.getElementById("btnLoadCSV");
  const msg = document.getElementById("importMsg");
  if (!fileEl || !loadBtn) return;

  const setMsg = (t) => { if (msg) msg.textContent = t || ""; };

  loadBtn.addEventListener("click", async () => {
    try {
      const f = fileEl.files && fileEl.files[0];
      if (!f) { setMsg("Please choose a .csv file first."); return; }
      const name = (f.name || "").toLowerCase();
      if (!name.endsWith(".csv")) { setMsg("Unsupported file. Please upload a .csv file."); return; }

      setMsg("Loading CSV…");
      if (!window.parseQuestionsFromCSV) throw new Error("CSV importer not loaded.");
      const qs = await window.parseQuestionsFromCSV(f);
      saveCustomQuestions(qs, "QUIZGEN (CSV)");
      setMsg(`Loaded ${qs.length} questions from CSV.`);
      setQuestionSet(qs, "QUIZGEN (CSV)");

      document.querySelector(".card.import")?.classList.add("compact");
      
    } catch (err) {
      setMsg(String(err && err.message ? err.message : err));
      console.error(err);
    }
  });
})();


// start
const saved = loadCustomQuestions();
if (saved) {
  setQuestionSet(saved.questions, saved.label);
} else {
  render();
}
