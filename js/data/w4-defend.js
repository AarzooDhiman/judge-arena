/* ==========================================================================
   WORLD 4 — DEFEND: the viva in miniature
   ========================================================================== */
window.JUDGE = window.JUDGE || {};
JUDGE.worlds = JUDGE.worlds || [];

JUDGE.GENERIC_PHRASES = [
  "better performance", "more accurate", "higher accuracy", "state-of-the-art", "state of the art",
  "widely used", "commonly used", "robust", "powerful", "complex relationships", "non-linear relationships",
  "industry standard", "best practice", "well-known", "popular"
];

JUDGE.VIVA_QUESTIONS = [
  { q: "Why this metric and not another?", tag: "Choices" },
  { q: "If you had to cut your results to one slide, what would stay?", tag: "Priorities" },
  { q: "What would change if your dataset were twice as big? Half as big?", tag: "Thinking ahead" },
  { q: "What did AI contribute to this work — and how did you check it?", tag: "AI use" },
  { q: "Where is your model most likely to be wrong?", tag: "Limits" },
  { q: "Explain your method to someone who will use the output but has never trained a model.", tag: "Explaining" },
  { q: "Which choice would you make differently now?", tag: "Reflection" },
  { q: "How do you know there's no leakage between your training and test data?", tag: "Rigour" },
  { q: "What's the simplest baseline you compared against — and why that one?", tag: "Rigour" },
  { q: "If your best result turned out to be a fluke, how would you find out?", tag: "Rigour" },
  { q: "Who could be harmed if your model is wrong, and how?", tag: "Consequences" },
  { q: "Why that model and not something simpler?", tag: "Choices" },
  { q: "Which figure in your report would you defend first, and why?", tag: "Priorities" },
  { q: "What assumption are you least sure about?", tag: "Limits" },
  { q: "What would a sceptical examiner pick at first?", tag: "Limits" },
  { q: "What does your main number actually mean for the person using it?", tag: "Explaining" },
  { q: "Without opening it: where in your code does your main result come from?", tag: "Ownership" },
  { q: "What did you try that didn't work?", tag: "Ownership" },
  { q: "What question does your work NOT answer?", tag: "Limits" },
  { q: "If you had one more week, what would you do — and why that?", tag: "Thinking ahead" }
];

JUDGE.VIVA_CHECKLIST = [
  { id: "answered", label: "Answered the actual question (not a nearby one)" },
  { id: "specific", label: "Specific to this project — not a textbook definition" },
  { id: "nonumbers", label: "Didn't recite numbers without saying what they mean" },
  { id: "honest", label: "Handled uncertainty honestly ('I'm not sure — I'd check by…')" }
];

JUDGE.CASE_SUMMARIES = {
  "ReAdmit": "Predicts which hospital patients will be readmitted within 30 days. 4,812 discharges from one trust (2019–2022), 37 features, 11.6% readmitted. XGBoost recall 0.74 vs 0.58 baseline; precision 0.41. The discharge team can phone about 40 patients a week.",
  "Humber Flood Watch": "Forecasts River Hull levels 6 and 24 hours ahead from six gauges (2015–2024). LightGBM is best at 6 h; the LSTM is best at 24 h and at flood peaks (12.1 cm error). One gauge has a three-month gap in 2021.",
  "Module Voice": "Classifies 1,840 module-feedback comments as positive, neutral or negative with DistilBERT. 89% accuracy but negative-class recall only 0.52. Late assessment feedback is the most common complaint."
};

JUDGE.worlds.push({
  id: "w4",
  num: 4,
  name: "Defend",
  tagline: "Your name is on it",
  intro: "In the viva, the report isn't in front of you. These levels practise the moment that exposed students who'd let AI do the thinking: explaining your choices, out loud, specifically.",
  colour: "violet",
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w4-l1",
      type: "whynot",
      title: "Why Not?",
      blurb: "Defend a decision against two alternatives — using the facts of the project.",
      minutes: 12,
      cases: [
        {
          id: "wn1", project: "ReAdmit",
          decision: "We chose XGBoost for ReAdmit.",
          facts: [
            "4,812 discharges, 37 tabular features",
            "Only 11.6% of patients were readmitted",
            "18% of lab values are missing",
            "Clinicians must be able to see WHY a patient was flagged",
            "The discharge team can phone about 40 patients a week",
            "It must run on the trust's standard laptops"
          ],
          factKeys: [
            { label: "Data size / tabular", any: ["4,812", "4812", "small", "few thousand", "tabular", "rows"] },
            { label: "Imbalance", any: ["11.6", "imbalanc", "rare", "minority"] },
            { label: "Missing values", any: ["missing", "nan", "imput", "18%"] },
            { label: "Explainability", any: ["explain", "interpret", "shap", "clinician", "why"] },
            { label: "Team capacity", any: ["40", "capacity", "phone", "calls", "threshold"] },
            { label: "Hardware", any: ["laptop", "cpu", "lightweight", "run on", "gpu"] }
          ],
          aiAnswer: "XGBoost was selected because it is a powerful, state-of-the-art gradient boosting algorithm known for its high accuracy and efficiency. Alternatives such as neural networks were considered, but they may require more data and computational resources. Logistic regression was rejected because it cannot capture complex non-linear relationships.",
          expert: "Logistic regression wasn't really 'rejected' — it's the baseline, and it's very explainable. The honest reason to move on is that XGBoost raised recall from 0.58 to 0.74 while staying explainable through SHAP, which the clinicians need. A neural network is a poor fit for 4,812 tabular rows with 18% missing lab values, and it would make 'why was this patient flagged?' much harder to answer. XGBoost also handles missing values natively and runs on a laptop. None of these reasons is 'state-of-the-art'."
        },
        {
          id: "wn2", project: "Humber Flood Watch",
          decision: "We kept LightGBM in the final system instead of using only the LSTM.",
          facts: [
            "LightGBM is slightly better at 6 h; the LSTM is better at 24 h and at flood peaks",
            "The council team only has CPU laptops — no GPU",
            "The model must be retrained weekly",
            "LightGBM trains in 42 s on CPU; the LSTM takes 38 min on a GPU",
            "One gauge has a three-month gap in 2021"
          ],
          factKeys: [
            { label: "Horizon split", any: ["6 h", "6-hour", "6 hour", "six hour", "short-term", "short term", "24"] },
            { label: "No GPU", any: ["gpu", "cpu", "laptop"] },
            { label: "Weekly retraining", any: ["weekly", "retrain"] },
            { label: "Training time", any: ["42", "minute", "fast", "training time", "train time", "38"] },
            { label: "Data gap", any: ["gap", "missing", "sutton"] },
            { label: "Flood peaks", any: ["peak", "flood", "high water", "high-water"] }
          ],
          aiAnswer: "LightGBM was retained due to its efficiency and strong performance on tabular data, while the LSTM is better at capturing temporal dependencies. Combining both models leverages their complementary strengths for robust forecasting.",
          expert: "Keep LightGBM for the 6-hour forecast because it's slightly better there AND it's the only model the council can retrain weekly on their own CPU laptops (42 s versus 38 min on a GPU they don't have). Keep the LSTM for the 24-hour peak warning because that's where it clearly wins (12.1 vs 15.7 cm) — but someone has to own its retraining. 'Complementary strengths' is the phrase an examiner will ask you to unpack."
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w4-l2",
      type: "roulette",
      title: "Viva Roulette",
      blurb: "Spin, answer out loud in 60 seconds, no notes. Your partner scores you.",
      minutes: 15,
      rounds: 3,
      seconds: 60
    }
  ]
});
