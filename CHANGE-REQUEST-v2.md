# JUDGE Arena — Change Request v2

Implement these changes to JUDGE Arena. Follow `CLAUDE.md` throughout: no build step, classic scripts, content only in `js/data/`, every colour from a CSS token, light and dark themes both working, UK English, no emoji.

Work in the **phases** at the end of this document. After each phase, stop, list the files you changed, and tell me how to test that phase in Live Server.

Where this document gives exact content (text, code snippets, answer keys), use it **word for word**. It has been checked for internal consistency: every number in a claim matches the code output or the project facts.

---

## 1. Sign-in: cohort instead of nickname

### 1.1 Config
Replace `classes` in `js/config.js` with two lists, and add the other new settings:

```js
trimesters: [
  { code: "T1", label: "Trimester 1" },
  { code: "T2", label: "Trimester 2" },
  { code: "T3", label: "Trimester 3" }
],
years: [
  { code: "25/26", label: "2025/26" },
  { code: "26/27", label: "2026/27" },
  { code: "older", label: "Earlier year" }
],
copyAllowance: 2,          // copies allowed before copying is blocked (see section 7)
blockPasteInAnswers: false // if true, pasting into answer boxes is blocked too
```

### 1.2 Sign-in screen
- Remove the nickname field.
- Ask **Trimester** (select) and **Academic year** (select). The cohort key is `"<trimester>|<year>"`, e.g. `T1|25/26`. Use this key everywhere the old class code was used: storage keys, leaderboard and dashboard.
- QR links carry both values: `?t=T1&y=25-26` (use `-` in the URL, convert back to `/`). If both are present, show them as a read-only chip like the current "Joining" chip.
- **New player:** "Start" asks them to choose a 4-digit PIN. The app then generates an anonymous **player code** in the format `JA-` plus 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, e.g. `JA-7K3P`. Show it on a full-screen card: "Your player code is JA-7K3P. Write it down — with your PIN it lets you continue on another device." Include a Copy button, which is exempt from the copy limit.
- **Returning player:** a "Continue with my player code" link reveals code + PIN fields.
- Auto-resume on the same device continues to work as now.
- The player code replaces the nickname everywhere it is shown (top bar, leaderboard, dashboard, judgement record).
- The instructor login stays as it is.

### 1.3 Supabase
In `supabase/schema.sql`, `judge_login` takes `(p_cohort text, p_player_code text, p_pin text)`. Add `judge_register(p_cohort, p_pin)`, which generates a unique player code server-side and returns `{ok, player_code, token}`. Unique index on `player_code`. Leaderboard and dashboard group by cohort.

---

## 2. Descriptions, project briefs and world debriefs

### 2.1 "How to play" card before every level
Every level opens on a card containing: the title, the description below, "About N minutes", how scoring works in one line, and a **Start** button (or **Continue from checkpoint** / **Start again**, see section 3). Add a `howTo` field to each level in the data files:

| Level | `howTo` |
|---|---|
| w1-l1 Blind Taste Test | You'll see 9 short pieces of work from three student projects: report paragraphs, notebook code and slides. For each one, rate it 1–5 on three things: is it clear, is it accurate, and is it specific to its project? (Open "About this project" to see what each project is.) Then guess whether a student, an AI, or a student with AI polishing wrote it, and bet on how sure you are. Most points come from rating quality like an examiner. The guess is worth less, on purpose. |
| w1-l2 Pairwise Duel | Seven pairs. Each shows two versions of the same thing: a slide title, a paragraph, a code cell or a viva answer. Pick the stronger version and the main reason it's stronger. The better version could be on either side. |
| w2-l1 Hallucination Hunt | The ReAdmit student asked an AI to write up their results from four notebook cells. For each cell you'll see the code, what it printed, and five sentences from the AI's write-up. Exactly two of the five are hallucinations: they claim something the code, its output, the project facts or the reference list don't support. Find both. Everything you need is on screen. |
| w2-l2 Claim Courtroom | Eight claims from a flood-forecasting report and five notebook outputs. For each claim, decide: **supported** (an output shows it), **contradicted** (an output shows the opposite), or **no evidence** (nothing on screen shows it either way). For supported or contradicted, point to the cell. |
| w2-l3 Speaker-Notes Sweep | Same as the Hallucination Hunt, but for a presentation. The Module Voice student wrote their speaker notes with AI help. Four notebook cells, five spoken lines each, two hallucinations per cell. |
| w3-l1 Number Diet | Three crowded results slides, each with the research question it's meant to answer. Tap at most three numbers to keep: the ones that answer the question. Then rewrite the slide title as the finding, in 15 words or fewer, with at most one number. |
| w3-l2 Jargon Jail | Two paragraphs full of AI-style filler. Edit each one in the box. Live meters show length against a target, banned filler words, whether you use one name for the same thing, and whether the key facts survived. Aim for all green. |
| w3-l3 Ten-Second Slide | A slide appears for 10 seconds, then disappears. Write what you'd say about it to the room, without looking. You score for saying what it means, naming the key idea, and not reciting numbers. |
| w4-l1 Why Not? | Every design choice invites "why not something else?". You'll see a decision, the project facts, and two alternatives the student rejected. For each alternative, choose the two reasons that genuinely justify rejecting it. Some options are generic and some are simply wrong. Then compare your choices with a typical AI answer. |
| w4-l2 Examiner's Chair | Swap seats: you're the examiner. Read a student's viva answer, tick which of four qualities it shows, and pick the follow-up question that would best test their understanding. Then see how the examiners marked it. |
| w5-l1 Think Before You Prompt | A real problem from one of the projects. Write your own approach first; it locks when you're done. Then judge an AI's six suggestions as useful, generic or wrong for this situation, and see which of your ideas the AI never had. |
| w5-l2 What the Model Couldn't Know | A team asked an AI how to turn their flood model into a warning tool, and the AI saw only that question. You can also read an email, a data note and meeting notes. Find the five parts of the AI's plan that break because of something it couldn't know, and say which piece of context breaks each one. |
| w5-l3 Off the Map | Write your own ideas first. Then rank six common answers from most to least useful, and see a chart of how often AI suggests each idea, with yours on it. Rare ideas that hold up score most. |
| w5-l4 Constraint Cards | Draw three cards (an audience, a format and a twist) and explain a project under those rules. The format rule is checked automatically where possible; you check the rest yourself. |
| boss | One complete mini-project in five stages: check the AI write-up against the code, cut the results slide, rewrite the summary, examine a viva answer, then write your judgement record. |

### 2.2 Project briefs (fixes the "specific to this project" problem)
Add `JUDGE.PROJECTS` in a new file, `js/data/projects.js`, loaded before the world files. Wherever a level shows a project tag, make the tag a button that opens an **About this project** panel showing that project's brief. In Blind Taste Test, show the brief panel open by default for the first item from each project. Rename the criterion "Specific to this project" to **"Specific to its project"**, with the hint "Could it only belong to this project, or would it fit any project?"

```js
JUDGE.PROJECTS = {
  "ReAdmit": {
    goal: "Predict which hospital patients will be readmitted within 30 days, so the discharge team can phone those most at risk.",
    data: "4,812 discharges from one NHS trust, 2019–2022. 37 features (age, prior admissions, lab results, living situation…). 11.6% of patients were readmitted. 18% of lab values are missing.",
    methods: "Logistic regression (baseline), random forest and XGBoost. SMOTE for class imbalance. SHAP to explain predictions.",
    results: "XGBoost: recall 0.74 (baseline 0.58), precision 0.41, AUROC 0.86.",
    audience: "Discharge nurses, who can phone about 40 patients a week, and clinicians, who need to see why a patient was flagged."
  },
  "Humber Flood Watch": {
    goal: "Forecast River Hull levels 6 and 24 hours ahead, to give the council early flood warnings.",
    data: "Hourly readings from six river gauges, 2015–2024 (87,672 hours). One gauge (Sutton Road) has a three-month gap in 2021.",
    methods: "Persistence baseline (assume the level stays the same), LightGBM and an LSTM neural network.",
    results: "LightGBM best at 6 h (6.1 cm error). LSTM best at 24 h (13.2 cm) and at flood peaks (12.1 cm).",
    audience: "Council duty officers, who need simple alerts and only have CPU laptops."
  },
  "Module Voice": {
    goal: "Classify anonymised module-feedback comments as positive, neutral or negative, and find what students complain about most.",
    data: "2,300 comments from 2023–24, 1,840 after cleaning. 78% positive, 13% neutral, 9% negative.",
    methods: "Fine-tuned DistilBERT, compared with TF-IDF + logistic regression.",
    results: "Accuracy 89%, macro-F1 0.71, but recall on negative comments only 0.52. Late assessment feedback is the most common complaint.",
    audience: "The department, deciding what to fix first."
  },
  "Late or Not?": {
    goal: "Predict which buses on Hull routes will arrive more than 5 minutes late, so passengers can be warned.",
    data: "312,000 stop arrivals on 9 routes, January 2025 – February 2026 (fictional operator). 21% of arrivals were late.",
    methods: "Logistic regression (baseline) and gradient boosting.",
    results: "Gradient boosting recall 0.68 (baseline 0.49), precision 0.55.",
    audience: "The bus operator, deciding whether to text passengers."
  }
};
```
Remove `JUDGE.CASE_SUMMARIES` once nothing uses it.

### 2.3 World debriefs (shown when a world is completed)
Add a `debrief` field to each world: `{ challenge, practised, improve: [] }`. When the last level of a world is finished, show a **World complete** screen before the results actions. It has three blocks: "The AI-overuse problem this world tackled", "What you practised", and "How to keep getting better" (a list). Then show the optional world feedback (section 6.1). The debrief stays readable afterwards from a "What this world was about" button on the world screen.

**World 1 — Taste**
- challenge: Accepting work because it sounds fluent. AI writes grammatical, confident, well-structured text whether or not it says anything. If you can't recognise quality, you can't tell when to reject an AI draft, and you hand in "average of everything" work that earns average marks.
- practised: Rating work on clarity, accuracy and specificity, whoever wrote it. You saw strong AI work and weak human work: who wrote something tells you very little about whether it's good.
- improve:
  - Before accepting any AI paragraph, ask: "Could this sentence appear in anyone else's project?" If it could, it's filler.
  - Read two or three top-marked dissertations or papers in your area and note what makes them specific.
  - Before you submit, rate your own draft 1–5 on clear, accurate and specific.
  - When you compare two drafts, name the reason one is better. Being able to say why is the skill.

**World 2 — Hunt**
- challenge: Unchecked claims. AI write-ups invent or "improve" numbers, describe steps the code never ran, cite papers that don't say what's claimed (or don't exist), and turn correlations into causes. All of it reads as confidently as the true sentences.
- practised: Checking every sentence against the code, its output and the sources, and deciding whether each claim is supported, contradicted or unsupported.
- improve:
  - Every number in your report should point to a notebook cell that printed it.
  - Only cite papers you've opened, and check the relevant section says what you're citing it for. Look up any unfamiliar reference in Google Scholar before keeping it.
  - Review your methods section with the notebook open beside it: does the code really do each step you describe?
  - Treat "proves", "causes", "all" and "every" as red flags that need evidence.

**World 3 — Craft**
- challenge: AI-style presentation: slides crammed with every metric, titles that name a section instead of a finding, and inflated prose that uses five words for one thing. It hides whether you understand your result, and in a viva it pushes you into reading numbers aloud.
- practised: Choosing the numbers that answer the research question, writing titles as findings, cutting filler while keeping every fact, and explaining a slide without looking at it.
- improve:
  - Write each slide title as a sentence that states the result.
  - Keep to three numbers per slide; move the rest to an appendix.
  - Read your paragraphs aloud. Cut any phrase you'd never actually say.
  - Pick one term per concept, then search your document for the synonyms.
  - Practise explaining each slide in 20 seconds without looking at it.

**World 4 — Defend**
- challenge: Borrowed reasoning. If AI chose your method and wrote your justification, you can recite it but not defend it. Generic reasons ("state-of-the-art", "more accurate", "captures complex relationships") collapse at the first follow-up question.
- practised: Telling project-specific reasons from generic ones, recognising strong and weak viva answers, and choosing the follow-up question that reveals real understanding.
- improve:
  - For every major choice, write down two alternatives and a reason tied to your data for rejecting each.
  - Ask a friend to question you with "what would happen if…" and "why not…?".
  - When you don't know, say how you would find out. Examiners respect that.
  - Practise explaining your main result to someone outside your subject.

**World 5 — Beyond the Prompt**
- challenge: Thinking by prompting. Asking AI before you've thought anchors you to its average answer, misses context it was never given, and makes your work sound like everyone else's.
- practised: Writing your own approach first, spotting where generic advice breaks on real-world context, generating ideas beyond the common list, and explaining under constraints.
- improve:
  - Spend ten minutes on your own outline before any prompt.
  - List the context an AI can't know (stakeholders, data quirks, constraints) and either give it explicitly or apply it yourself.
  - When AI suggests ideas, ask which of them every other student will also get.
  - Keep a notebook of your own ideas, and use AI to challenge them rather than to supply them.

**Boss — Your Name Is On It**
- challenge: Everything at once: fluent but unchecked write-ups, crowded slides, inflated prose and borrowed reasoning, all in one submission with your name on it.
- practised: The full workflow: verify, cut, rewrite, examine and record your judgement.
- improve:
  - Draft first, then delegate specific tasks to AI rather than the whole piece.
  - Check every number and citation before you submit.
  - Fill in a judgement record for every assignment where you use AI.
  - Rehearse explaining every choice without notes.

---

## 3. Checkpoints (leave mid-level without losing progress)

- Add `ctx.checkpoint` with `save(data)`, `load()` and `clear()`, stored at `state.checkpoints[levelId]` = `{ data, savedAt, itemIndex, score, max }`.
- **Multi-item levels** (rate, duel, claimcheck, diet, jargon, flash, whynot, examiner, thinkfirst, offmap, constraints): save after every completed item. Save the item index, the running score and max, and anything the end-of-level summary needs (e.g. the headlines written, origin-guess counts, logged evidence lines). Inside an item, also save drafts of free-text answers on input (debounced 500 ms), so typed text isn't lost.
- **Single-screen levels** (court, the context hunt w5-l2): save the current selections on every change.
- **Boss:** save the stage index plus the current stage's checkpoint.
- Text inside a locked "Think first" answer must stay locked on resume.
- When a level with a checkpoint is opened, the How-to-play card shows "Continue from item 4 of 9 (saved 10:42)" and **Start again** (which clears the checkpoint).
- The world screen shows "In progress — item 4 of 9" on that level's card.
- Leaving a level (the back button, the top bar, closing the tab) needs no confirmation, because the checkpoint is already saved. Show a small "Progress saved" note in the level header after each save.
- On finish, clear the checkpoint.
- Checkpoints are stored on the device only. They are never sent to Supabase, because they contain answers (see section 8).

---

## 4. Content and mechanic changes

### 4.1 Pairwise Duel: randomise sides
At the moment the better version is always B. Fix it at runtime: for each duel, randomly decide whether to swap A and B on screen, and store the swap in the checkpoint so it's stable on resume. Rewrite every `why` so it doesn't refer to letters. Use "the stronger version" and "the weaker version", e.g. d2: "The weaker version only says what every limitations section says. The stronger one names the actual boundary of the evidence and what follows from it." Keep `better` in the data as the authoring reference. Across a run, the stronger version should appear on the left roughly half the time.

### 4.2 New engine `claimcheck`: replaces the hunt in w2-l1, w2-l3 and the boss Stage 1
- The level has `background` (a list of fact strings), `references` (a list of `{cite, summary}`) and `snippets`. Each snippet has `{id, title, code, output, claims:[{id, text, ok, why}]}` with **exactly two** claims where `ok:false`.
- Show a pinned "Project facts and references" card at the top (collapsible on mobile). It holds the background facts and the reference list, with one line per paper saying what that paper is about.
- One snippet per screen (progress "Cell 2 of 4"). Code and output sit on the left; the five claims are on the right as checkable cards.
- The student must select **exactly 2**; the Check button is enabled only at 2. On check: each correct pick +10, then reveal every claim as ✓ supported or ✗ hallucination, with its `why`.
- Max 20 per snippet. Sharp Eye badge: all hallucinations found across the whole level.
- Keep the old `hunt` engine. It's still used by w5-l2 (What the Model Couldn't Know), which isn't changing.

**w2-l1 Hallucination Hunt (ReAdmit)**

```js
background: [
  "ReAdmit predicts whether a hospital patient will be readmitted within 30 days.",
  "Dataset: 4,812 discharges from one NHS trust, 2019–2022. 37 features plus the outcome column ('readmitted') and a patient ID.",
  "11.6% of patients were readmitted. Some patients appear more than once (repeat admissions)."
],
references: [
  { cite: "Chawla et al. (2002)", summary: "Introduced SMOTE, a method for oversampling the minority class." },
  { cite: "Breiman (2001)", summary: "Introduced random forests." },
  { cite: "Saito & Rehmsmeier (2015)", summary: "Showed precision–recall curves are more informative than ROC curves on imbalanced data." },
  { cite: "Lundberg & Lee (2017)", summary: "Introduced SHAP values for explaining model predictions." }
],
snippets: [
  { id: "h1", title: "Cell 2 — load and split",
    code: `df = pd.read_csv("data/readmit.csv")
print(df.shape)
print(df["readmitted"].mean().round(3))

X = df.drop(columns=["readmitted", "patient_id"])
y = df["readmitted"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)
print(len(X_train), len(X_test))`,
    output: "(4812, 39)\n0.116\n3849 963",
    claims: [
      { id: "a", ok: true,  text: "The dataset contains 4,812 discharges.", why: "The shape (4812, 39) shows 4,812 rows." },
      { id: "b", ok: true,  text: "The data were split 80/20 into training and test sets, stratified by outcome.", why: "test_size=0.2 and stratify=y." },
      { id: "c", ok: true,  text: "The training set contained 3,849 discharges and the test set 963.", why: "Printed on the last line." },
      { id: "d", ok: false, text: "After removing the outcome and patient ID, 39 features remained.", why: "39 is the total number of columns. Dropping 'readmitted' and 'patient_id' leaves 37 features. The AI copied the wrong number from the output." },
      { id: "e", ok: false, text: "Patients were split by patient ID, so no patient appears in both sets.", why: "The code drops patient_id and splits rows at random. With repeat admissions, the same patient can be in both sets. The write-up describes a safeguard the code never ran." }
    ] },
  { id: "h2", title: "Cell 3 — rebalance the training data",
    code: `smote = SMOTE(random_state=42)
X_res, y_res = smote.fit_resample(X_train, y_train)
print(y_train.value_counts().to_dict())
print(y_res.value_counts().to_dict())`,
    output: "{0: 3403, 1: 446}\n{0: 3403, 1: 3403}",
    claims: [
      { id: "a", ok: true,  text: "SMOTE was applied to the training data only; the test set was not resampled.", why: "fit_resample is called on X_train and y_train only." },
      { id: "b", ok: true,  text: "Before resampling, the training set had 446 readmitted patients.", why: "First output line: {1: 446}." },
      { id: "c", ok: true,  text: "After SMOTE, both classes had 3,403 examples.", why: "Second output line." },
      { id: "d", ok: false, text: "The minority class was oversampled with SMOTE (Breiman, 2001).", why: "Breiman (2001) introduced random forests (see the reference list). SMOTE is Chawla et al. (2002). Real-but-wrong citations are harder to catch than fake ones." },
      { id: "e", ok: false, text: "SMOTE increased the training set to about 9,000 discharges.", why: "3,403 + 3,403 = 6,806. The number was invented." }
    ] },
  { id: "h3", title: "Cell 4 — train and evaluate",
    code: `model = XGBClassifier(n_estimators=300, max_depth=6,
                      learning_rate=0.05, random_state=42)
model.fit(X_res, y_res)
proba = model.predict_proba(X_test)[:, 1]
pred = (proba >= 0.5).astype(int)
print("AUROC", round(roc_auc_score(y_test, proba), 2))
print("PR-AUC", round(average_precision_score(y_test, proba), 2))
print("Recall", round(recall_score(y_test, pred), 2),
      "Precision", round(precision_score(y_test, pred), 2))`,
    output: "AUROC 0.86\nPR-AUC 0.52\nRecall 0.74 Precision 0.41",
    claims: [
      { id: "a", ok: true,  text: "XGBoost reached an AUROC of 0.86 on the held-out test set.", why: "First output line, computed on X_test." },
      { id: "b", ok: true,  text: "Because readmissions are rare, we also report PR-AUC (0.52), which is more informative than ROC on imbalanced data (Saito & Rehmsmeier, 2015).", why: "PR-AUC is computed and printed, and the citation matches the reference list." },
      { id: "c", ok: true,  text: "At a 0.5 threshold, precision was 0.41.", why: "The threshold is set in the code; precision is printed." },
      { id: "d", ok: false, text: "Recall was 0.91, so the model finds nine in ten readmitted patients.", why: "The output says 0.74, roughly three in four." },
      { id: "e", ok: false, text: "Hyperparameters were tuned with a 5-fold cross-validated grid search.", why: "The hyperparameters are fixed in the code. There's no grid search and no cross-validation, so the AI described a step that never happened." }
    ] },
  { id: "h4", title: "Cell 5 — explain the model",
    code: `explainer = shap.TreeExplainer(model)
sv = explainer.shap_values(X_test)
imp = pd.Series(np.abs(sv).mean(0), index=X_test.columns)
print(imp.sort_values(ascending=False).head(3).round(3))`,
    output: "prior_admissions_12m    0.412\nlives_alone             0.187\nage                     0.153",
    claims: [
      { id: "a", ok: true,  text: "Mean absolute SHAP values (Lundberg & Lee, 2017) show admissions in the previous 12 months as the strongest predictor.", why: "Top of the output; correct citation." },
      { id: "b", ok: true,  text: "Living alone was the second most important feature.", why: "Second line of the output." },
      { id: "c", ok: true,  text: "Age ranked third.", why: "Third line of the output." },
      { id: "d", ok: false, text: "This demonstrates that living alone causes readmission.", why: "SHAP shows the model USES living alone to predict, not that it causes readmission. It may stand in for frailty or lack of support at home." },
      { id: "e", ok: false, text: "This is consistent with Henderson & Malik (2021), who found social isolation doubled readmission risk.", why: "Not in the reference list, and no such study exists. A plausible author, a plausible number: a typical hallucinated citation." }
    ] }
]
```

**w2-l3 Speaker-Notes Sweep (Module Voice)**: same engine. The claims are the presenter's spoken lines.

```js
background: [
  "Module Voice classifies anonymised module-feedback comments as positive, neutral or negative.",
  "Comments were collected in 2023–24. Each has a module code and a label from a human coder.",
  "The presenter wrote these speaker notes with AI help."
],
references: [
  { cite: "Devlin et al. (2019)", summary: "Introduced BERT." },
  { cite: "Sanh et al. (2019)", summary: "Introduced DistilBERT, a smaller and faster version of BERT." }
],
snippets: [
  { id: "m1", title: "Cell 1 — clean the comments",
    code: `df = pd.read_csv("data/feedback_2023_24.csv")
print(len(df))
df = df.dropna(subset=["text"])
df = df.drop_duplicates(subset="text")
df = df[df.groupby("module")["text"].transform("count") >= 10]
print(len(df))`,
    output: "2300\n1840",
    claims: [
      { id: "a", ok: true,  text: "\"We started with 2,300 comments.\"", why: "First output line." },
      { id: "b", ok: true,  text: "\"We removed empty and duplicate comments.\"", why: "dropna on text, then drop_duplicates." },
      { id: "c", ok: true,  text: "\"Modules with fewer than ten comments were left out.\"", why: "The groupby filter keeps modules with 10 or more comments." },
      { id: "d", ok: false, text: "\"That left 1,950 comments for analysis.\"", why: "The output says 1,840." },
      { id: "e", ok: false, text: "\"We also translated non-English comments into English first.\"", why: "No translation step appears anywhere in the code." }
    ] },
  { id: "m2", title: "Cell 2 — labels and split",
    code: `print(df["label"].value_counts(normalize=True).round(2).to_dict())
train_df, test_df = train_test_split(
    df, test_size=0.2, stratify=df["label"], random_state=7)
print(len(train_df), len(test_df))`,
    output: "{'positive': 0.78, 'neutral': 0.13, 'negative': 0.09}\n1472 368",
    claims: [
      { id: "a", ok: true,  text: "\"78% of comments were positive and only 9% negative.\"", why: "First output line." },
      { id: "b", ok: true,  text: "\"We trained on 1,472 comments and tested on 368.\"", why: "Second output line." },
      { id: "c", ok: true,  text: "\"The split was stratified, so both sets keep the same mix of labels.\"", why: "stratify=df['label']." },
      { id: "d", ok: false, text: "\"The three classes were roughly balanced.\"", why: "78% / 13% / 9% is heavily imbalanced, and that matters for every metric that follows." },
      { id: "e", ok: false, text: "\"We kept a separate validation set for tuning.\"", why: "There's one split into train and test, with no validation set." }
    ] },
  { id: "m3", title: "Cell 3 — fine-tune",
    code: `tok = AutoTokenizer.from_pretrained("distilbert-base-uncased")
model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased", num_labels=3)
args = TrainingArguments("out", num_train_epochs=3)
trainer = Trainer(model=model, args=args, train_dataset=to_ds(train_df, tok))
print(trainer.train())`,
    output: "TrainOutput(global_step=552, training_loss=0.41, epoch=3.0)",
    claims: [
      { id: "a", ok: true,  text: "\"We fine-tuned DistilBERT for three epochs.\"", why: "num_train_epochs=3, and the output shows epoch=3.0." },
      { id: "b", ok: true,  text: "\"DistilBERT is a smaller, faster version of BERT (Sanh et al., 2019).\"", why: "Matches the reference list." },
      { id: "c", ok: true,  text: "\"The model predicts three classes.\"", why: "num_labels=3." },
      { id: "d", ok: false, text: "\"We chose DistilBERT, introduced by Devlin et al. (2019).\"", why: "Devlin et al. introduced BERT; DistilBERT is Sanh et al. (see the references). Right family, wrong paper." },
      { id: "e", ok: false, text: "\"We trained for ten epochs to make sure it converged.\"", why: "Three epochs, in both the code and the output." }
    ] },
  { id: "m4", title: "Cell 4 — evaluate",
    code: `out = trainer.predict(to_ds(test_df, tok))
preds = out.predictions.argmax(-1)
print(classification_report(test_df["label_id"], preds,
      target_names=["negative", "neutral", "positive"], digits=2))`,
    output: "              precision  recall  f1-score\nnegative           0.68    0.52      0.59\nneutral            0.55    0.61      0.58\npositive           0.95    0.98      0.96\n\naccuracy                             0.89\nmacro avg                            0.71",
    claims: [
      { id: "a", ok: true,  text: "\"Accuracy was 89%.\"", why: "accuracy 0.89." },
      { id: "b", ok: true,  text: "\"Macro-F1 was 0.71.\"", why: "The macro avg row." },
      { id: "c", ok: true,  text: "\"Recall on negative comments was 0.52, so about half the complaints were missed.\"", why: "The negative row, correctly interpreted." },
      { id: "d", ok: false, text: "\"So the model classifies student sentiment almost perfectly.\"", why: "89% accuracy is mostly the 78% positive majority. The model misses half the complaints, the comments that matter most." },
      { id: "e", ok: false, text: "\"Complaints are caught reliably — negative recall was 0.85.\"", why: "The output says 0.52." }
    ] }
]
```

**Boss Stage 1 (Late or Not?)**: `claimcheck` with two snippets.

```js
background: [
  "Late or Not? predicts whether a bus will arrive more than 5 minutes late (fictional operator).",
  "312,000 stop arrivals on 9 Hull routes, January 2025 – February 2026."
],
references: [
  { cite: "Friedman (2001)", summary: "Introduced gradient boosting machines." }
],
snippets: [
  { id: "b1", title: "Cell 1 — prepare and split",
    code: `df = df.sort_values("scheduled_time")
print(len(df), round(df["late"].mean(), 2))
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=True, random_state=1)`,
    output: "312000 0.21",
    claims: [
      { id: "a", ok: true,  text: "We used 312,000 stop arrivals.", why: "Printed." },
      { id: "b", ok: true,  text: "21% of arrivals were late.", why: "Printed." },
      { id: "c", ok: true,  text: "20% of arrivals were held out for testing.", why: "test_size=0.2." },
      { id: "d", ok: false, text: "We trained on the first 80% of the timeline and tested on the most recent 20%.", why: "The data is sorted by time, but shuffle=True then mixes it up randomly. Arrivals from the same journey and the same rainy afternoon land in both sets: leakage." },
      { id: "e", ok: false, text: "The data covered all 23 bus routes in Hull.", why: "The project facts say 9 routes." }
    ] },
  { id: "b2", title: "Cell 2 — model and features",
    code: `gb = GradientBoostingClassifier(random_state=1).fit(X_train, y_train)
print(classification_report(y_test, gb.predict(X_test), digits=2))
print(pd.Series(gb.feature_importances_, index=X.columns).nlargest(2).round(2))`,
    output: "              precision  recall\non_time            0.91    0.87\nlate               0.55    0.68\n\nrain_mm        0.31\nhour_of_day    0.24",
    claims: [
      { id: "a", ok: true,  text: "Gradient boosting (Friedman, 2001) caught 68% of late arrivals.", why: "Late recall 0.68; correct citation." },
      { id: "b", ok: true,  text: "Precision was 0.55, so just over half of 'late' warnings would be right.", why: "Late precision 0.55." },
      { id: "c", ok: true,  text: "Time of day was the second most important feature.", why: "hour_of_day is second." },
      { id: "d", ok: false, text: "Rainfall was the most important feature, proving that rain causes delays.", why: "Importance shows the model relies on rainfall, not that rain causes delays. Rain also brings more passengers and more traffic." },
      { id: "e", ok: false, text: "The model can therefore be deployed on every bus network in the UK.", why: "Nine routes in one city over 14 months can't support a claim about every UK network." }
    ] }
]
```

### 4.3 Why Not?: fixed alternatives with option choices
Replace the free-text alternatives. Each case lists `alternatives` (two). Each alternative has 5 `options` with `ok:true` on exactly two, and a `why` on every option. The student ticks exactly 2 per alternative: +10 for each correct pick, so max 40 per case. Then show the typical AI answer and the expert answer, as now. Add an optional, unscored box: "In one sentence, how would you say this in a viva?"

**wn1** (decision: "We chose XGBoost for ReAdmit.")
- **Logistic regression**
  - ✓ "It found fewer readmitted patients: recall 0.58 against 0.74 for XGBoost, and catching readmissions is the goal." (Ties the rejection to the project's own result and goal.)
  - ✓ "It needs the 18% missing lab values to be filled in first, which may throw away information; XGBoost handles missing values itself." (Specific to this data.)
  - ✗ "Logistic regression can't model non-linear relationships." (Overstated: with the right features it can. And it says nothing about this project.)
  - ✗ "It's an older method, so it's less accurate." (Age isn't a reason. Logistic regression is often hard to beat.)
  - ✗ "Clinicians wouldn't be able to understand it." (Wrong: it's one of the most interpretable models there is.)
- **Neural network**
  - ✓ "4,812 rows of tabular data is small for a neural network; tree models usually do better on data like this." (Specific to the data size and type.)
  - ✓ "Clinicians must see why a patient was flagged, and SHAP on XGBoost gives that more simply." (Tied to the audience's need.)
  - ✗ "Neural networks are state-of-the-art, so they'd be overkill." (Generic, and it contradicts itself.)
  - ✗ "Neural networks can't be used for classification." (False.)
  - ✗ "Neural networks always need a GPU." (False for a model this size, and not the real reason.)

**wn2** (decision: "We kept LightGBM in the final system instead of using only the LSTM.")
- **Use only the LSTM**
  - ✓ "The council only has CPU laptops; the LSTM needs 38 minutes on a GPU, and the model must be retrained weekly." (Specific constraint plus evidence.)
  - ✓ "LightGBM is slightly more accurate at 6 hours ahead (6.1 cm against 6.4 cm)." (From the results.)
  - ✗ "LSTMs are outdated." (Not a reason, and not true.)
  - ✗ "LSTMs can't handle time-series data." (False: that's what they're designed for.)
  - ✗ "Using one model would lose the complementary strengths." (Vague: which strengths?)
- **Use only LightGBM**
  - ✓ "At flood peaks 24 hours ahead, the LSTM errs by 12.1 cm against 15.7 cm, and peaks are when warnings matter." (The decisive, specific reason.)
  - ✓ "The LSTM is more accurate 24 hours ahead overall (13.2 cm against 14.9 cm)." (From the results.)
  - ✗ "Deep learning is more modern, so it should be included." (Generic.)
  - ✗ "LightGBM can't use time features." (False.)
  - ✗ "Combining models is always more robust." (An absolute claim with no evidence.)

### 4.4 Replace Viva Roulette with **Examiner's Chair** (engine `examiner`)
Viva Roulette can't tell students whether their spoken answer was right, so remove it, and remove the "My own project" option everywhere. In Examiner's Chair the student reads a pre-written viva answer and marks it. Every judgement has an answer key.

- Per round: show the project brief (collapsible), the examiner's question, and the student's answer as a transcript. The player ticks which of the 4 qualities the answer shows, then picks the best follow-up question (3 options).
- Score: +5 for each checklist item judged the same as the key (max 20), plus +10 for the right follow-up, giving 30 per round.
- Reveal: the key for each item with a one-line reason, why that follow-up is best, and a model answer.
- Checklist (fixed): **A** Answers the question that was asked · **B** Specific to this project · **C** Says what any numbers mean (or needs none) · **D** Is honest about limits or uncertainty.
- Badge "Honest 'I don't know'" now goes to anyone who scores full marks on a round where the key has D = yes.

**w4-l2 rounds**

1. **ReAdmit.** Q: "Why did you report recall rather than accuracy?" Answer: "So accuracy was 0.89, precision 0.41, recall 0.74, F1 0.53, AUROC 0.86 and PR-AUC 0.52. Recall was the best one, so we focused on that."
   Key: A no (it never says why) · B no · C no (recites six numbers with no meaning) · D no.
   Follow-ups: ✓ "What accuracy would a model get that predicts 'no readmission' for every patient?" · "Can you define recall?" · "Which Python library did you use?"
   Why: the right follow-up exposes whether they understand that accuracy is misleading at 11.6% prevalence.
   Model answer: "Only 11.6% of patients were readmitted, so a model that predicts 'nobody' is already 88% accurate. Recall tells us how many of the real readmissions we catch, which is what the discharge team needs."
2. **Humber Flood Watch.** Q: "Where is your model most likely to be wrong?" Answer: "Probably at the Sutton Road gauge after April 2021. It was moved downstream and now reads about 18 cm higher for the same water level, and we didn't correct for that, so forecasts there could be biased upwards. I'd check by comparing the errors before and after the move."
   Key: A yes · B yes · C yes · D yes.
   Follow-ups: ✓ "If you had another week, how would you correct the shift?" · "What is an LSTM?" · "How many gauges did you use?"
   Why: they've shown understanding, so push for the next step.
3. **Module Voice.** Q: "What did AI contribute to this work, and how did you check it?" Answer: "I used AI to help with the code and the write-up, and I checked everything carefully to make sure it was correct and high quality."
   Key: A no (no actual check is described) · B no · C yes (no numbers needed) · D no.
   Follow-ups: ✓ "Tell me one thing the AI got wrong and how you found it." · "Which AI tool did you use?" · "Do you think AI is good for students?"
   Why: a concrete example is the only way to tell real checking from a claim.
4. **ReAdmit.** Q: "Why XGBoost and not something simpler?" Answer: "XGBoost is a state-of-the-art gradient boosting algorithm known for its high accuracy and efficiency, and it can capture complex non-linear relationships in the data."
   Key: A no · B no · C yes · D no.
   Follow-ups: ✓ "What did logistic regression score on recall, and was the gain worth the extra complexity?" · "Who invented gradient boosting?" · "What does 'non-linear' mean?"
   Why: it forces a comparison with the project's own baseline.

**Boss Stage 4**: 2 rounds.

5. **Late or Not?** Q: "What does recall 0.68 mean for a passenger?" Answer: "Of all the buses that really were late, we'd have warned about two in three, so a third of late buses would still catch people out. I'm not sure yet how annoying the false alarms would be, because precision is only 0.55, so I'd want to test it with real passengers before rolling it out."
   Key: A yes · B yes · C yes · D yes.
   Follow-ups: ✓ "How would you design that test with passengers?" · "What is precision?" · "How many routes did you use?"
6. **Late or Not?** Q: "Where is your model most likely to be wrong?" Answer: "The model is very accurate, 82%, so it is unlikely to be wrong very often."
   Key: A no · B no · C no (82% is used as reassurance without saying what it means) · D no.
   Follow-ups: ✓ "79% of buses are on time. How accurate would a model be that always says 'on time'?" · "What is accuracy?" · "Which features did you use?"

### 4.5 Off the Map: own ideas, then ranking, then chart
New flow:
1. **Your ideas first** (up to 2, at least 5 words each). Keep this before the options. Seeing options first anchors students to them, which is the problem this level is about.
2. **Rank** six given options from most useful (1) to least (6), using up/down buttons per row (keyboard accessible, no drag-only control). Options for om1: the themes fair, calib, external, unflagged, addvalue, shap. For om2: stats, leak, lit, matters, rerun, opposite.
3. **Map** each of your own ideas to the closest theme, or to "Not on the list" (with a justification of at least 12 words, as now).
4. **Chart** (inline SVG via `JUDGE.render.chart`, extended to support a second marker): one horizontal bar per theme showing how many of 30 AI runs suggested it. Mark the player's top-3 ranked themes with a "Your top 3" tag. Add a highlighted bar for each of the player's off-list ideas labelled "Your idea", with an AI count of 0. If Supabase is on, add a second series: the percentage of the cohort who ranked each theme in their top 3, fetched with a new RPC `judge_offmap_summary(p_cohort, p_question)` that returns aggregated counts only.
5. Scoring: ranking isn't marked right or wrong. Give +5 for completing it, plus the rarity score for own ideas as now (max 20). Under the chart, show the expert comment:
   - om1: "Many people rank fairness and explainability first because AI always mentions them, and they matter. But 'does it add anything over the nurses' own judgement?' decides whether the model is worth using at all, and AI almost never asks it."
   - om2: "Significance tests are the common answer. 'Would the difference matter to a real user?' and 'have someone else re-run it from scratch' are rarer, and often more revealing."

### 4.6 Remove
- The `roulette` engine, `JUDGE.VIVA_QUESTIONS` (keep the question list in a comment block for teaching use), and the "My own project" option in Constraint Cards. Constraint Cards should use the four case projects only, with the project brief shown.

---

## 5. Badges after these changes
Keep: Calibrated, Sharp Eye (claimcheck: all hallucinations found in a level), Three Numbers Max, Plain Speaker, Honest "I don't know" (redefined in 4.4), Own Thinker, Context Detective, Off the Map, Your Name Is On It. Add **Sharp Examiner**: full marks on every round of Examiner's Chair.

---

## 6. Feedback

### 6.1 After each world (optional)
After the debrief, show a card: a 1–5 star rating ("How useful was this world?") plus an optional comment box (max 500 characters) and two buttons, **Send** and **Skip**. Store it in `state.feedback.worlds[worldId] = {rating, comment, at}`. Never ask twice for the same world, but let players change it from the world screen.

### 6.2 After the boss (required)
Before the boss results screen, show the final questionnaire. The results screen and the judgement record download unlock only once questions 1–8 are answered. Question 9 is optional.

1. Overall, how useful was JUDGE Arena for your learning? — Very useful / Useful / Somewhat useful / Not useful
2. Which world helped you most? — Taste / Hunt / Craft / Defend / Beyond the Prompt / The final level
3. Which world helped you least? — (same options)
4. After playing, how confident are you at spotting problems in AI-generated work? — Much more confident / A bit more / No change / Less confident
5. Will you change how you use AI in your coursework? (tick all that apply) — Check numbers against my code more / Check citations before using them / Write my own draft before prompting / Cut filler and jargon from AI text / Prepare to explain my choices without notes / I won't change anything
6. How difficult was it? — Too easy / About right / Too hard
7. How long did it take overall? — Too short / About right / Too long
8. Would you recommend it to next year's students? — Yes / Maybe / No
9. Anything else you'd like to tell us? (optional, max 1,000 characters)

Store this in `state.feedback.final`. With Supabase on, send both kinds of feedback through `judge_feedback(p_token, p_kind, p_world, p_payload jsonb)` into a new `judge_feedback` table. Add the feedback to the instructor dashboard: the average star rating per world, and a count for each option of each final question.

---

## 7. Copy limit and paste logging

- Listen for `copy` and `cut` on `document`. Copying from text the player typed themselves (inside `textarea` and `input`) does **not** count. Neither does the app's own Copy buttons (player code, judgement record); mark them with `data-copy-ok`.
- Copies 1 and 2 (the `copyAllowance` from config): allow them, then show a small toast: "Copy 1 of 2. JUDGE Arena is designed to be done here, without outside tools."
- After that: block the copy with `preventDefault()` and show a modal: "Copying is switched off. The point of JUDGE Arena is to practise your own judgement, so the whole task should be done here. Your progress is saved." Further copy attempts are blocked silently but still counted. Also apply `user-select: none` to the level content (`.level-root`), except form fields.
- Count every attempt per level, allowed and blocked.
- **Paste into answer boxes:** log the event (level, length in characters, never the content). If `blockPasteInAnswers` is true, block it with a toast: "Pasting is switched off here — type your own answer."
- Be honest about the limits in the About page: "Copying is limited to encourage doing the work here. It can't stop screenshots or retyping; it's a nudge, not a lock."

---

## 8. Engagement analytics (Supabase only, no answers stored)

### 8.1 Consent (once, at first sign-in, before any events are sent)
A card titled "Help improve JUDGE Arena (optional)":

> With your permission, we record how you use JUDGE Arena — which levels you reach, how long they take, your scores, how often you come back, and copy/paste counts. We never record what you type or which answers you choose. Records use your anonymous player code, not your name. This may be used in research on how students learn to use AI, under the university's ethics approval. You can still play fully if you say no.

Buttons: **Yes, include my usage data** / **No thanks**. Store `research_consent` with a timestamp on the player row. If the answer is no, send only what the game itself needs (progress, XP and leaderboard) and send no events. The answer can be changed from the Account screen.

### 8.2 What to record
New table `judge_events (id bigserial, player_id uuid, session_id uuid, cohort text, type text, world_id text, level_id text, payload jsonb, client_ts timestamptz, created_at timestamptz default now())`. Write to it only through `judge_log_events(p_token uuid, p_events jsonb)`, which takes a batch array of at most 50 events with each payload under 2 KB. Reject the batch if the player hasn't consented. The client queues events, flushes every 20 seconds and on `visibilitychange`, and drops the queue after 3 failed attempts.

| type | payload (no answer content, ever) |
|---|---|
| `session_start` | `device` (mobile/tablet/desktop from viewport width), `viewport_w`, `entry` ("qr" if the URL had t/y params, otherwise "direct"), `local_hour`, `timers_on`, `visit_number` |
| `session_end` | `active_s`, `total_s` (sent on pagehide via `navigator.sendBeacon` where possible) |
| `world_open` | `world_id`, `unlocked` |
| `level_start` | `attempt_no`, `from_checkpoint` (bool), `item_index` |
| `item_done` | `item_index`, `item_points`, `item_max`, `item_active_s` |
| `level_exit` | `item_index`, `active_s` (left before finishing) |
| `level_complete` | `score`, `max`, `stars`, `attempt_no`, `active_s`, `total_s`, `items` |
| `world_complete` | `world_id`, `total_active_s` |
| `copy_attempt` | `level_id`, `allowed` (bool), `count_so_far` |
| `paste` | `level_id`, `chars`, `blocked` (bool) |
| `tab_hidden` | `level_id`, `hidden_s` (sent when the tab becomes visible again, only if the player was away for more than 5 s) |
| `badge` | `badge_id` |
| `checkpoint_resume` | `level_id`, `item_index`, `minutes_since_save` |
| `feedback` | `kind` ("world"/"final"), with the ratings and options (the comment text goes to `judge_feedback`, not here) |

**Active time** counts only while the tab is visible and the player has interacted (pointer, key or scroll) in the last 60 seconds.

Add these to `judge_players`: `first_seen`, `last_seen`, `visit_count` (incremented at `session_start` when more than 30 minutes have passed since `last_seen`), `research_consent`, `consent_at`.

**Stop syncing the full state blob to Supabase**: it contains answers and checkpoint drafts. Sync a progress summary instead, via a reworked `judge_save(p_token, p_progress jsonb, p_xp)` where `p_progress = { levels: {id: {done, best, max, stars, attempts}}, badges: [ids], worlds_done: n }`. Cross-device continuation then restores completed levels and badges, but not mid-level checkpoints, which stay on the original device. Say this on the sign-in screen.

### 8.3 Instructor research export
On the Instructor screen, when Supabase is on and the staff code is entered, add **Export engagement data (CSV)**. It calls `judge_export_events(p_cohort, p_staff_code)` and `judge_export_summary(p_cohort, p_staff_code)` and downloads two CSV files: raw events, and one row per player (player code, consent, visits, total active time, levels done, per-level best score and active time, copy attempts, pastes, world ratings and final questionnaire answers). Only export consented players' events. The summary for non-consented players contains progress only.

---

## 9. Phases — implement in this order and stop after each

1. **Sign-in and identity** (section 1): config, sign-in screen, player code, QR parameters, local storage keys. Update the instructor QR generator to produce `?t=&y=` links.
2. **Descriptions** (section 2): `projects.js`, how-to-play cards, project brief panels, world debriefs.
3. **Checkpoints** (section 3).
4. **Content and mechanics** (section 4 and section 5): duel randomisation, the `claimcheck` engine and its three data sets, Why Not? options, Examiner's Chair (world 4 and boss), Off the Map ranking and chart, the removals.
5. **Feedback** (section 6), local storage first.
6. **Copy and paste** (section 7).
7. **Supabase** (sections 1.3, 6.2 and 8): update `supabase/schema.sql` as one idempotent script that keeps the existing tables, adds the new ones, uses SECURITY DEFINER functions only, and keeps RLS on with no direct table access. Update `remote.js` and add the event queue.
8. **Check everything**: play every level as a new player (with a checkpoint exit and resume in at least three levels, including the boss), confirm worlds still unlock only in order, confirm the console has no errors, and confirm the layout at 360 px and 1280 px in light and dark themes. Then update `README.md` and `DEVELOPING.md` to match.

Afterwards, list anything you couldn't do or had to interpret.
