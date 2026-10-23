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
  project: "Late or Not?",
  levels: [
    {
      id: "boss",
      type: "boss",
      title: "Your Name Is On It",
      blurb: "Five stages. One project. Your judgement record at the end.",
      minutes: 30,
      stages: [
        {
          id: "boss-hunt", type: "hunt", title: "Stage 1 — Hunt",
          project: "Late or Not?",
          brief: "The results section and notebook for 'Late or Not?'. 5 planted flaws.",
          flawTypes: "default",
          panels: [
            {
              title: "Report — Results", kind: "report", flaggable: true,
              segments: [
                { id: "h1", text: "We used 312,000 stop arrivals on 9 routes from January 2025 to February 2026." },
                { id: "h2", text: "A bus counted as late if it arrived more than 5 minutes after the timetable; 21% of arrivals were late." },
                { id: "h3", text: "Arrivals were split randomly into 80% training and 20% test data." },
                { id: "h4", text: "Gradient boosting caught 74% of late arrivals, compared with 49% for logistic regression." },
                { id: "h5", text: "Rainfall was the most important feature, proving that rain causes bus delays." },
                { id: "h6", text: "As shown by Okafor (2024), real-time delay models reduce passenger complaints by 40%." },
                { id: "h7", text: "Precision was 0.55, so just over half of 'late' warnings would be correct." },
                { id: "h8", text: "The model can therefore be deployed on every bus network in the UK." }
              ]
            },
            {
              title: "Notebook — 03_model.ipynb", kind: "code", flaggable: true,
              segments: [
                { id: "g1", text: "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=True)" },
                { id: "g2", text: "gb = GradientBoostingClassifier(random_state=1).fit(X_train, y_train)" },
                { id: "g3", text: "print(classification_report(y_test, gb.predict(X_test)))" }
              ]
            },
            { title: "Output", kind: "output", flaggable: false, text: "              precision    recall\non time            0.91      0.87\nlate               0.55      0.68" }
          ],
          flaws: [
            { id: "bf1", segs: ["h3", "g1"], type: "leakage", why: "A random shuffle puts stops from the SAME journey (and the same rainy afternoon) in both train and test. The model gets to peek at neighbours. Split by date: train on earlier months, test on later ones." },
            { id: "bf2", segs: ["h4"], type: "mismatch", why: "The output says recall 0.68 for late buses, not 74%." },
            { id: "bf3", segs: ["h5"], type: "causation", why: "Important to the model ≠ cause. Rain also means more passengers, more traffic and darker evenings." },
            { id: "bf4", segs: ["h6"], type: "fabricated", why: "No such study. A specific author, year and percentage is exactly what a hallucinated citation looks like." },
            { id: "bf5", segs: ["h8"], type: "overclaim", why: "Nine routes in one city, 14 months, one operator. That supports 'promising for these routes', not 'every network in the UK'." }
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
          id: "boss-viva", type: "roulette", title: "Stage 4 — Defend it", rounds: 2, seconds: 60,
          fixedQuestions: [
            { q: "What does recall 0.68 actually mean for a passenger waiting at a stop?", tag: "Explaining" },
            { q: "Where is this model most likely to be wrong — and who pays for that mistake?", tag: "Limits" }
          ],
          caseProject: "Late or Not?"
        },
        { id: "boss-record", type: "record", title: "Stage 5 — Judgement record" }
      ]
    }
  ]
};

JUDGE.CASE_SUMMARIES = JUDGE.CASE_SUMMARIES || {};
JUDGE.CASE_SUMMARIES["Late or Not?"] = "Predicts which buses on 9 Hull routes will arrive more than 5 minutes late. 312,000 arrivals over 14 months; 21% late. Gradient boosting recall 0.68 (baseline 0.49), precision 0.55. Its main flaw: a random split that leaks between train and test.";
