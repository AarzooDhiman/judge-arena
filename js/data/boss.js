/* ==========================================================================
   BOSS — "Your Name Is On It"
   A complete mini-project. Every skill from Worlds 1–5, then a judgement record.
   ========================================================================== */
window.JUDGE = window.JUDGE || {};

JUDGE.boss = {
  id: "boss",
  num: 6,
  name: "Your Name Is On It",
  tagline: "The final viva",
  intro: "A complete mini-project: 'Late or Not?' predicts which buses on Hull routes will arrive more than 5 minutes late (fictional operator, fictional data). Hunt the flaws, fix the slide, fix the paragraph, defend it out loud — then write your judgement record.",
  colour: "gold",
  debrief: {
    challenge: "Everything at once: fluent but unchecked write-ups, crowded slides, inflated prose and borrowed reasoning, all in one submission with your name on it.",
    practised: "The full workflow: verify, cut, rewrite, examine and record your judgement.",
    improve: [
      "Draft first, then delegate specific tasks to AI rather than the whole piece.",
      "Check every number and citation before you submit.",
      "Fill in a judgement record for every assignment where you use AI.",
      "Rehearse explaining every choice without notes."
    ]
  },
  project: "Late or Not?",
  levels: [
    {
      id: "boss",
      type: "boss",
      title: "Your Name Is On It",
      blurb: "Five stages. One project. Your judgement record at the end.",
      minutes: 30,
      howTo: "One complete mini-project in five stages: check the AI write-up against the code, cut the results slide, rewrite the summary, examine a viva answer, then write your judgement record.",
      stages: [
        {
          id: "boss-hunt", type: "claimcheck", title: "Stage 1 — Hunt",
          project: "Late or Not?",
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
        },
        {
          id: "boss-diet", type: "diet", title: "Stage 2 — Number Diet",
          slides: [
            {
              id: "bd1", project: "Late or Not?",
              question: "Should the operator text passengers when their bus is likely to be late?",
              slide: {
                title: "Model Results",
                bullets: [
                  "[[a|312,000]] arrivals, [[b|9]] routes, [[c|14]] months",
                  "[[d|21%]] of arrivals late (more than [[e|5]] min)",
                  "Gradient boosting: accuracy [[f|0.82]], recall [[g|0.68]], precision [[h|0.55]], F1 [[i|0.61]]",
                  "Baseline recall [[j|0.49]]",
                  "[[k|200]] trees, depth [[l|3]], training time [[m|11]] min"
                ]
              },
              points: { g: 10, h: 5, j: 5, d: 3, f: -5, i: -2, k: -2, l: -2, m: -2 },
              key: "g",
              modelHeadline: "We'd flag two in three late buses; just over half the warnings would be right.",
              why: "For a texting decision, two things matter: how many late buses you warn about (recall 0.68) and how many texts are false alarms (precision 0.55). Annoying people with wrong texts is the real cost. Accuracy (0.82) hides that 79% of buses are on time anyway."
            }
          ]
        },
        {
          id: "boss-jargon", type: "jargon", title: "Stage 3 — Jargon Jail",
          paragraphs: [
            {
              id: "bj1", project: "Late or Not?", label: "Summary paragraph",
              original: "Harnessing a cutting-edge gradient boosting paradigm, this framework seamlessly delivers robust, real-time delay insights. The algorithm leverages a comprehensive suite of 23 features, including weather, time of day and route, to empower operators in navigating the complexities of urban mobility. Crucially, the solution achieved a recall of 0.68, underscoring its transformative potential.",
              targetWords: 40,
              synonyms: ["framework", "algorithm", "solution", "model", "paradigm", "system"],
              facts: [
                { label: "Gradient boosting", any: ["gradient boosting"] },
                { label: "23 features", any: ["23", "twenty-three"] },
                { label: "Weather", any: ["weather", "rain"] },
                { label: "Time of day", any: ["time of day", "time"] },
                { label: "Route", any: ["route"] },
                { label: "Recall 0.68", any: ["0.68", "68%", "two in three", "two-thirds", "2 in 3"] }
              ],
              model: "Our gradient boosting model uses 23 features, including weather, time of day and route, to predict late buses. It catches about two in three late arrivals (recall 0.68).",
              lesson: "'Real-time' disappeared — nothing in the project shows it runs in real time. Jargon is often where unproven claims hide."
            }
          ]
        },
        {
          id: "boss-viva", type: "examiner", title: "Stage 4 — Defend it",
          rounds: [
              {
                id: "e5", project: "Late or Not?",
                question: "What does recall 0.68 mean for a passenger?",
                answer: "Of all the buses that really were late, we'd have warned about two in three, so a third of late buses would still catch people out. I'm not sure yet how annoying the false alarms would be, because precision is only 0.55, so I'd want to test it with real passengers before rolling it out.",
                key: {
                  A: { yes: true },
                  B: { yes: true },
                  C: { yes: true },
                  D: { yes: true }
                },
                followups: [
                  { text: "How would you design that test with passengers?", ok: true },
                  { text: "What is precision?", ok: false },
                  { text: "How many routes did you use?", ok: false }
                ]
              },
              {
                id: "e6", project: "Late or Not?",
                question: "Where is your model most likely to be wrong?",
                answer: "The model is very accurate, 82%, so it is unlikely to be wrong very often.",
                key: {
                  A: { yes: false },
                  B: { yes: false },
                  C: { yes: false, why: "82% is used as reassurance without saying what it means" },
                  D: { yes: false }
                },
                followups: [
                  { text: "79% of buses are on time. How accurate would a model be that always says 'on time'?", ok: true },
                  { text: "What is accuracy?", ok: false },
                  { text: "Which features did you use?", ok: false }
                ]
              }
            ]
        },
        { id: "boss-record", type: "record", title: "Stage 5 — Judgement record" }
      ]
    }
  ]
};
