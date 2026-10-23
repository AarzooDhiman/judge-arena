/* ==========================================================================
   WORLD 5 — BEYOND THE PROMPT: thinking AI can't do for you
   ========================================================================== */
window.JUDGE = window.JUDGE || {};
JUDGE.worlds = JUDGE.worlds || [];

JUDGE.worlds.push({
  id: "w5",
  num: 5,
  name: "Beyond the Prompt",
  tagline: "Think where AI can't",
  intro: "AI gives you the average of everything it has read. These levels reward what it can't give you: your own first thought, the context nobody typed into the prompt, and the idea nobody else had.",
  colour: "rose",
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w5-l1",
      type: "thinkfirst",
      title: "Think Before You Prompt",
      blurb: "Write your own answer first. Then judge the AI's — and see what only you thought of.",
      minutes: 15,
      thinkSeconds: 180,
      problems: [
        {
          id: "tf1", project: "ReAdmit",
          problem: "ReAdmit flags about 120 patients a week as high risk. The discharge team can only phone 40. What do you do?",
          aiPoints: [
            { id: "a1", text: "Raise the decision threshold so the model flags only around 40 patients a week.", tag: "useful", why: "Simple and matches capacity. But check what recall drops to — and weekly volumes vary." },
            { id: "a2", text: "Rank patients by predicted risk each week and call the top 40.", tag: "useful", why: "Better than a fixed threshold: it adapts to busy and quiet weeks. It relies on the ranking being good, which PR-AUC tells you about." },
            { id: "a3", text: "Collect more data to improve the model's performance.", tag: "generic", why: "Possibly true one day, but it doesn't solve this week's 80 extra patients." },
            { id: "a4", text: "Apply SMOTE to rebalance the classes and reduce the number of false positives.", tag: "wrong", why: "Oversampling usually makes a model flag MORE positives, not fewer. It doesn't address a capacity limit at all." },
            { id: "a5", text: "Switch to a deep neural network for higher accuracy.", tag: "wrong", why: "Accuracy isn't the bottleneck, 4,812 tabular rows don't suit deep learning, and clinicians would lose the explanations they need." },
            { id: "a6", text: "Ensure ethical considerations and stakeholder engagement are addressed throughout.", tag: "generic", why: "True of every project ever. Says nothing you could act on." }
          ],
          humanExamples: [
            "Ask the nurses which flagged patients they'd have phoned anyway — the model's real value is the ones they would have missed.",
            "Check whether the 80 patients NOT called are disproportionately from one group (age, postcode, ward).",
            "Send a text or letter to the next 80 instead of nothing — it doesn't have to be call or no call."
          ]
        },
        {
          id: "tf2", project: "Module Voice",
          problem: "The Head of School wants one 'student satisfaction score' per module, produced automatically by Module Voice, to rank modules in a league table. How do you respond?",
          aiPoints: [
            { id: "b1", text: "Average the predicted sentiment of all comments for each module to produce the score.", tag: "wrong", why: "Negative recall is 0.52 — the model misses half the complaints, so every score is flattered, and modules with more negative comments are flattered most." },
            { id: "b2", text: "Show the number of comments and a confidence interval next to each module's score.", tag: "useful", why: "A score from 12 comments and a score from 300 are not comparable. Showing that is honest." },
            { id: "b3", text: "Use a larger transformer model to improve accuracy before ranking modules.", tag: "generic", why: "Treats a question about whether to rank at all as a modelling problem." },
            { id: "b4", text: "Exclude modules with fewer than 10 comments, to protect anonymity and avoid noisy scores.", tag: "useful", why: "Matches the project's existing anonymity rule and avoids ranking on noise." },
            { id: "b5", text: "Present the results in an interactive dashboard for stakeholders.", tag: "generic", why: "A format, not an answer. A misleading number in a nicer dashboard is still misleading." },
            { id: "b6", text: "Because the model is 89% accurate, the rankings can be treated as reliable.", tag: "wrong", why: "Accuracy is inflated by the 78% positive comments. The errors are concentrated in exactly the comments that matter." }
          ],
          humanExamples: [
            "Only students who chose to comment are in the data — ask who's missing before ranking anyone.",
            "A league table changes behaviour: staff might discourage critical comments to protect their score.",
            "Report what to fix (top complaint topics per module), not who's worst — it's more useful and less harmful."
          ]
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w5-l2",
      type: "hunt",
      variant: "context",
      title: "What the Model Couldn't Know",
      blurb: "An AI plan that looks fine — until you read the emails it never saw.",
      minutes: 15,
      project: "Humber Flood Watch",
      brief: "The team asked an AI assistant: 'How should we turn our river-level model into a flood warning tool for the council?' It only saw that one question. You also have the documents below. Click each sentence of the AI's plan that breaks because of something it couldn't know — then choose which piece of context breaks it.",
      flawTypes: [
        { id: "K1", label: "Officers need a yes/no alert at 4.2 m" },
        { id: "K2", label: "No Python or servers — Excel and laptops only" },
        { id: "K3", label: "Sutton Road gauge moved; readings shifted +0.18 m" },
        { id: "K4", label: "A missed flood is far worse than a false alarm" },
        { id: "K5", label: "High tide stops the River Hull draining" }
      ],
      panels: [
        {
          title: "Email — Flood Resilience Officer, Hull City Council (fictional)", kind: "doc", flaggable: false,
          text: "Thanks for the demo — really impressive. A practical note though: our duty officers don't look at charts at 3am. They get one alert on their phone: is the Drypool gauge going over 4.2 m in the next 24 hours, yes or no?\n\nAlso, IT won't let us run Python or host any servers. We live in Excel on council laptops, so whatever you hand over has to work in that world."
        },
        {
          title: "Data dictionary — sutton_rd_level_m", kind: "doc", flaggable: false,
          text: "Level at Sutton Road gauge, metres above datum.\n\nNOTE: gauge relocated ~300 m downstream on 2021-04-12. Readings after this date are ~0.18 m higher for the same water level. NOT corrected in this extract."
        },
        {
          title: "Meeting notes — drainage and tidal operations (fictional)", kind: "doc", flaggable: false,
          text: "• Missed event = homes flooded. False alarm = a crew call-out (~£2k) and some grumbling. 'We'd take three false alarms over one miss.'\n• When the Humber is at high tide the River Hull can't drain — the tidal barrier closes and the river backs up.\n• Most of our near-misses were heavy rain AND a spring tide together."
        },
        {
          title: "The AI's plan", kind: "report", flaggable: true,
          segments: [
            { id: "x1", text: "To build an effective flood forecasting solution, I recommend the following approach." },
            { id: "x2", text: "First, combine the full hourly history from all six gauges into a single training set." },
            { id: "x3", text: "Use a time-based split — train on earlier years and test on the most recent — so the evaluation reflects real forecasting." },
            { id: "x4", text: "Train an LSTM to predict the continuous river level 24 hours ahead, and present the forecast as a curve with uncertainty bands." },
            { id: "x5", text: "Rainfall is the main driver of river levels, so adding rainfall radar data should give the biggest improvement." },
            { id: "x6", text: "Choose the decision threshold that maximises overall accuracy, so false alarms and missed floods are balanced." },
            { id: "x7", text: "Deploy the model as a Python web API with an interactive dashboard so officers can explore the forecasts." },
            { id: "x8", text: "Evaluate separately on high-water events, since average error can hide poor performance when it matters." },
            { id: "x9", text: "Retrain the model regularly as new data arrives." }
          ]
        }
      ],
      flaws: [
        { id: "q1", segs: ["x2"], type: "K3", why: "Mixing pre- and post-2021 Sutton Road readings teaches the model a fake 18 cm jump. Correct the datum shift (or treat it as two series) before combining." },
        { id: "q2", segs: ["x4"], type: "K1", why: "Officers need yes/no at 4.2 m, not a curve. Frame it as 'will Drypool exceed 4.2 m in 24 h?' — and evaluate on that question." },
        { id: "q3", segs: ["x5"], type: "K5", why: "Locally, tide is the missing driver: rain + spring tide caused the near-misses. Tide tables are free and predictable years ahead — the AI had no way to know that mattered here." },
        { id: "q4", segs: ["x6"], type: "K4", why: "'Balancing' errors is wrong when one error floods homes and the other costs £2k. Set the threshold for high recall and accept more false alarms." },
        { id: "q5", segs: ["x7"], type: "K2", why: "The council can't run Python or servers. A brilliant dashboard they can't open is worth nothing. Deliver an alert, or something that runs in their world." }
      ],
      lesson: "None of the AI's advice was stupid. It was generic — correct for an average project, wrong for this one. The context it lacked was sitting in an email, a footnote and a meeting. In real work, that context is your job."
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w5-l3",
      type: "offmap",
      title: "Off the Map",
      blurb: "Score points for good ideas the AI rarely or never suggests.",
      minutes: 15,
      runsNote: "Counts are illustrative: they show how often typical AI answers include each idea across 30 runs of the same prompt. Your instructor can replace them with real runs.",
      questions: [
        {
          id: "om1", project: "ReAdmit",
          question: "Apart from accuracy-style metrics, how could you judge whether ReAdmit is actually a good model to use?",
          runs: 30,
          themes: [
            { id: "fair", label: "Check fairness across patient groups", count: 27 },
            { id: "shap", label: "Explainability (SHAP, feature importance)", count: 25 },
            { id: "calib", label: "Check calibration of the risk scores", count: 22 },
            { id: "users", label: "Get clinician / user feedback", count: 18 },
            { id: "external", label: "External validation at another trust", count: 16 },
            { id: "drift", label: "Monitor performance drift over time", count: 11 },
            { id: "cost", label: "Cost–benefit or economic analysis", count: 9 },
            { id: "shadow", label: "Run a silent ('shadow') trial alongside the ward", count: 4 },
            { id: "unflagged", label: "Look at what happens to patients the model does NOT flag", count: 1 },
            { id: "addvalue", label: "Ask whether it adds anything over nurses' own judgement", count: 1 }
          ]
        },
        {
          id: "om2", project: "Any project",
          question: "Your dissertation's main claim is 'Model X beats Model Y on this task.' WITHOUT training any more models, how could you test whether that claim is really true?",
          runs: 30,
          themes: [
            { id: "stats", label: "Significance test or confidence intervals", count: 26 },
            { id: "seeds", label: "Check variance across folds / random seeds", count: 21 },
            { id: "lit", label: "Compare with published results", count: 19 },
            { id: "leak", label: "Check for data leakage", count: 15 },
            { id: "errors", label: "Error analysis on misclassified examples", count: 14 },
            { id: "expert", label: "Ask a domain expert to review predictions", count: 10 },
            { id: "shift", label: "Check the test set resembles real-world data", count: 8 },
            { id: "matters", label: "Ask whether the difference would matter to a real user", count: 3 },
            { id: "rerun", label: "Have someone else re-run the notebook from scratch", count: 2 },
            { id: "opposite", label: "Argue the opposite claim and list the evidence you'd need", count: 1 }
          ]
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w5-l4",
      type: "constraints",
      title: "Constraint Cards",
      blurb: "Draw three cards. Explain a project under strange rules. Creativity under pressure.",
      minutes: 15,
      rounds: 2,
      decks: {
        audience: [
          "A hospital board with five minutes",
          "A curious 14-year-old",
          "A sceptical external examiner",
          "A journalist who wants a headline",
          "The people whose data you used",
          "An employer, in a job interview"
        ],
        format: [
          { text: "Zero numbers", check: "nodigits" },
          { text: "Under 50 words", check: "max50" },
          { text: "One analogy — nothing else", check: null },
          { text: "Exactly three numbered steps", check: "threesteps" },
          { text: "Start with what went wrong", check: null },
          { text: "Only questions — every sentence ends with '?'", check: "questions" }
        ],
        twist: [
          "Your best result turned out to be a fluke",
          "Half your data was just deleted",
          "Your audience is affected by your model's mistakes",
          "A rival model is 2% better than yours",
          "Spend one sentence arguing against your own method",
          "Say what AI did — and didn't do — in this work"
        ]
      },
      rubric: [
        { id: "audience", label: "My audience would understand it" },
        { id: "accurate", label: "The key idea is still accurate" },
        { id: "twist", label: "The twist genuinely changed what I said" }
      ]
    }
  ]
});
