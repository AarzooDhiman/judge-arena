/* ==========================================================================
   WORLD 4 — DEFEND: the viva in miniature
   ========================================================================== */
window.JUDGE = window.JUDGE || {};
JUDGE.worlds = JUDGE.worlds || [];

/* Question bank from the retired Viva Roulette level, kept for teaching use (for example
   as a source of practice questions for pairs). Nothing in the app reads it.

[
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
*/

JUDGE.worlds.push({
  id: "w4",
  num: 4,
  name: "Defend",
  tagline: "Your name is on it",
  intro: "In the viva, the report isn't in front of you. These levels practise the moment that exposed students who'd let AI do the thinking: explaining your choices, out loud, specifically.",
  colour: "violet",
  debrief: {
    challenge: "Borrowed reasoning. If AI chose your method and wrote your justification, you can recite it but not defend it. Generic reasons (\"state-of-the-art\", \"more accurate\", \"captures complex relationships\") collapse at the first follow-up question.",
    practised: "Telling project-specific reasons from generic ones, recognising strong and weak viva answers, and choosing the follow-up question that reveals real understanding.",
    improve: [
      "For every major choice, write down two alternatives and a reason tied to your data for rejecting each.",
      "Ask a friend to question you with \"what would happen if…\" and \"why not…?\".",
      "When you don't know, say how you would find out. Examiners respect that.",
      "Practise explaining your main result to someone outside your subject."
    ]
  },
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w4-l1",
      type: "whynot",
      title: "Why Not?",
      blurb: "Defend a decision against two alternatives — using the facts of the project.",
      minutes: 12,
      howTo: "Every design choice invites \"why not something else?\". You'll see a decision, the project facts, and two alternatives the student rejected. For each alternative, choose the two reasons that genuinely justify rejecting it. Some options are generic and some are simply wrong. Then compare your choices with a typical AI answer.",
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
          alternatives: [
            {
              name: "Logistic regression",
              options: [
                { text: "It found fewer readmitted patients: recall 0.58 against 0.74 for XGBoost, and catching readmissions is the goal.", ok: true, why: "Ties the rejection to the project's own result and goal." },
                { text: "It needs the 18% missing lab values to be filled in first, which may throw away information; XGBoost handles missing values itself.", ok: true, why: "Specific to this data." },
                { text: "Logistic regression can't model non-linear relationships.", ok: false, why: "Overstated: with the right features it can. And it says nothing about this project." },
                { text: "It's an older method, so it's less accurate.", ok: false, why: "Age isn't a reason. Logistic regression is often hard to beat." },
                { text: "Clinicians wouldn't be able to understand it.", ok: false, why: "Wrong: it's one of the most interpretable models there is." }
              ]
            },
            {
              name: "Neural network",
              options: [
                { text: "4,812 rows of tabular data is small for a neural network; tree models usually do better on data like this.", ok: true, why: "Specific to the data size and type." },
                { text: "Clinicians must see why a patient was flagged, and SHAP on XGBoost gives that more simply.", ok: true, why: "Tied to the audience's need." },
                { text: "Neural networks are state-of-the-art, so they'd be overkill.", ok: false, why: "Generic, and it contradicts itself." },
                { text: "Neural networks can't be used for classification.", ok: false, why: "False." },
                { text: "Neural networks always need a GPU.", ok: false, why: "False for a model this size, and not the real reason." }
              ]
            }
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
          alternatives: [
            {
              name: "Use only the LSTM",
              options: [
                { text: "The council only has CPU laptops; the LSTM needs 38 minutes on a GPU, and the model must be retrained weekly.", ok: true, why: "Specific constraint plus evidence." },
                { text: "LightGBM is slightly more accurate at 6 hours ahead (6.1 cm against 6.4 cm).", ok: true, why: "From the results." },
                { text: "LSTMs are outdated.", ok: false, why: "Not a reason, and not true." },
                { text: "LSTMs can't handle time-series data.", ok: false, why: "False: that's what they're designed for." },
                { text: "Using one model would lose the complementary strengths.", ok: false, why: "Vague: which strengths?" }
              ]
            },
            {
              name: "Use only LightGBM",
              options: [
                { text: "At flood peaks 24 hours ahead, the LSTM errs by 12.1 cm against 15.7 cm, and peaks are when warnings matter.", ok: true, why: "The decisive, specific reason." },
                { text: "The LSTM is more accurate 24 hours ahead overall (13.2 cm against 14.9 cm).", ok: true, why: "From the results." },
                { text: "Deep learning is more modern, so it should be included.", ok: false, why: "Generic." },
                { text: "LightGBM can't use time features.", ok: false, why: "False." },
                { text: "Combining models is always more robust.", ok: false, why: "An absolute claim with no evidence." }
              ]
            }
          ],
          aiAnswer: "LightGBM was retained due to its efficiency and strong performance on tabular data, while the LSTM is better at capturing temporal dependencies. Combining both models leverages their complementary strengths for robust forecasting.",
          expert: "Keep LightGBM for the 6-hour forecast because it's slightly better there AND it's the only model the council can retrain weekly on their own CPU laptops (42 s versus 38 min on a GPU they don't have). Keep the LSTM for the 24-hour peak warning because that's where it clearly wins (12.1 vs 15.7 cm) — but someone has to own its retraining. 'Complementary strengths' is the phrase an examiner will ask you to unpack."
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w4-l2",
      type: "examiner",
      title: "Examiner's Chair",
      blurb: "Swap seats. Judge a student's viva answer, then choose the follow-up question.",
      minutes: 15,
      howTo: "Swap seats: you're the examiner. Read a student's viva answer, tick which of four qualities it shows, and pick the follow-up question that would best test their understanding. Then see how the examiners marked it.",
      rounds: [
        {
          id: "e1", project: "ReAdmit",
          question: "Why did you report recall rather than accuracy?",
          answer: "So accuracy was 0.89, precision 0.41, recall 0.74, F1 0.53, AUROC 0.86 and PR-AUC 0.52. Recall was the best one, so we focused on that.",
          key: {
            A: { yes: false, why: "it never says why" },
            B: { yes: false },
            C: { yes: false, why: "recites six numbers with no meaning" },
            D: { yes: false }
          },
          followups: [
            { text: "What accuracy would a model get that predicts 'no readmission' for every patient?", ok: true },
            { text: "Can you define recall?", ok: false },
            { text: "Which Python library did you use?", ok: false }
          ],
          followWhy: "the right follow-up exposes whether they understand that accuracy is misleading at 11.6% prevalence.",
          model: "Only 11.6% of patients were readmitted, so a model that predicts 'nobody' is already 88% accurate. Recall tells us how many of the real readmissions we catch, which is what the discharge team needs."
        },
        {
          id: "e2", project: "Humber Flood Watch",
          question: "Where is your model most likely to be wrong?",
          answer: "Probably at the Sutton Road gauge after April 2021. It was moved downstream and now reads about 18 cm higher for the same water level, and we didn't correct for that, so forecasts there could be biased upwards. I'd check by comparing the errors before and after the move.",
          key: {
            A: { yes: true },
            B: { yes: true },
            C: { yes: true },
            D: { yes: true }
          },
          followups: [
            { text: "If you had another week, how would you correct the shift?", ok: true },
            { text: "What is an LSTM?", ok: false },
            { text: "How many gauges did you use?", ok: false }
          ],
          followWhy: "they've shown understanding, so push for the next step."
        },
        {
          id: "e3", project: "Module Voice",
          question: "What did AI contribute to this work, and how did you check it?",
          answer: "I used AI to help with the code and the write-up, and I checked everything carefully to make sure it was correct and high quality.",
          key: {
            A: { yes: false, why: "no actual check is described" },
            B: { yes: false },
            C: { yes: true, why: "no numbers needed" },
            D: { yes: false }
          },
          followups: [
            { text: "Tell me one thing the AI got wrong and how you found it.", ok: true },
            { text: "Which AI tool did you use?", ok: false },
            { text: "Do you think AI is good for students?", ok: false }
          ],
          followWhy: "a concrete example is the only way to tell real checking from a claim."
        },
        {
          id: "e4", project: "ReAdmit",
          question: "Why XGBoost and not something simpler?",
          answer: "XGBoost is a state-of-the-art gradient boosting algorithm known for its high accuracy and efficiency, and it can capture complex non-linear relationships in the data.",
          key: {
            A: { yes: false },
            B: { yes: false },
            C: { yes: true },
            D: { yes: false }
          },
          followups: [
            { text: "What did logistic regression score on recall, and was the gain worth the extra complexity?", ok: true },
            { text: "Who invented gradient boosting?", ok: false },
            { text: "What does 'non-linear' mean?", ok: false }
          ],
          followWhy: "it forces a comparison with the project's own baseline."
        }
      ]
    }
  ]
});
