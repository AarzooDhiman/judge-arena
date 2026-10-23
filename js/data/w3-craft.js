/* ==========================================================================
   WORLD 3 — CRAFT: fix the problems examiners saw in the viva
   Slide numbers marked [[id|text]] become clickable in Number Diet.
   ========================================================================== */
window.JUDGE = window.JUDGE || {};
JUDGE.worlds = JUDGE.worlds || [];

JUDGE.BANNED_WORDS = [
  "delve", "delves", "delving", "leverage", "leverages", "leveraging", "leveraged",
  "robust", "paradigm", "holistic", "holistically", "multifaceted", "seamless", "seamlessly",
  "cutting-edge", "state-of-the-art", "transformative", "revolutionise", "revolutionising", "revolutionize", "revolutionizing",
  "showcase", "showcases", "showcasing", "utilise", "utilising", "utilize", "utilizing",
  "in order to", "furthermore", "subsequently", "ultimately", "thereby", "rigorously", "comprehensive",
  "groundbreaking", "pivotal", "crucial", "crucially", "landscape", "tapestry", "navigate", "navigating",
  "realm", "underscore", "underscores", "underscoring", "unprecedented", "harness", "harnessing",
  "intricate", "rapidly evolving", "complexities", "empower", "empowering", "insights"
];

JUDGE.worlds.push({
  id: "w3",
  num: 3,
  name: "Craft",
  tagline: "Fix it like you mean it",
  intro: "In the viva, students read numbers off crowded slides and defended paragraphs nobody could follow. Here you fix exactly those problems — with meters that tell you when you've done it.",
  colour: "coral",
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w3-l1",
      type: "diet",
      title: "Number Diet",
      blurb: "Three crowded slides. Keep at most 3 numbers each. Then write the headline.",
      minutes: 12,
      slides: [
        {
          id: "nd1", project: "ReAdmit",
          question: "Can we flag patients at risk of readmission early enough for the discharge team to phone them?",
          slide: {
            title: "Model Performance Summary",
            bullets: [
              "Dataset: [[a|4,812]] discharges, [[b|37]] features, [[c|11.6%]] readmitted within [[d|30]] days",
              "XGBoost: accuracy [[e|0.89]], AUROC [[f|0.86]], PR-AUC [[g|0.52]], F1 [[h|0.53]]",
              "Recall [[i|0.74]] (baseline [[j|0.58]]), precision [[k|0.41]]",
              "[[l|300]] trees, learning rate [[m|0.05]], max depth [[n|6]], [[o|5]]-fold CV, trained in [[p|3.2]] min"
            ]
          },
          points: { i: 10, j: 5, k: 5, c: 3, e: -5, l: -2, m: -2, n: -2, o: -2, p: -2 },
          key: "i",
          modelHeadline: "The model catches three in four readmissions — up from under six in ten.",
          why: "The question is about FINDING patients, so recall (0.74) is the number that answers it. The baseline (0.58) shows it's an improvement; precision (0.41) shows the cost in wasted calls. Accuracy (0.89) is a trap: predicting 'nobody' scores 0.884. Hyperparameters belong in the appendix, not on the results slide."
        },
        {
          id: "nd2", project: "Humber Flood Watch",
          question: "Can we give the council a day's warning before the River Hull reaches dangerous levels?",
          slide: {
            title: "Results",
            bullets: [
              "[[a|87,672]] hourly readings from [[b|6]] gauges, [[c|2015]]–[[d|2024]]",
              "6 h ahead — MAE: persistence [[e|9.8]] cm, LightGBM [[f|6.1]] cm, LSTM [[g|6.4]] cm",
              "24 h ahead — MAE: persistence [[h|19.6]] cm, LightGBM [[i|14.9]] cm, LSTM [[j|13.2]] cm",
              "Top 5% of levels, 24 h ahead: persistence [[k|21.4]] cm, LightGBM [[l|15.7]] cm, LSTM [[m|12.1]] cm",
              "Training: LightGBM [[n|42]] s, LSTM [[o|38]] min"
            ]
          },
          points: { m: 10, k: 5, l: 5, j: 3, f: -4, g: -4, e: -2, a: -2, n: -2, o: -2 },
          key: "m",
          modelHeadline: "A day ahead, the LSTM predicts flood peaks to within about 12 cm.",
          why: "'A day's warning' + 'dangerous levels' = 24 hours ahead, at peaks. That's row four. The 6-hour results are real but answer a different question. If you kept the 6-hour numbers you were answering the slide, not the research question."
        },
        {
          id: "nd3", project: "Module Voice",
          question: "What should the department fix first?",
          slide: {
            title: "Sentiment Analysis Results",
            bullets: [
              "[[a|2,300]] comments → [[b|1,840]] after cleaning",
              "DistilBERT accuracy [[c|89%]], macro-F1 [[d|0.71]]; TF-IDF + LR macro-F1 [[e|0.64]]",
              "Class share: positive [[f|78%]], neutral [[g|13%]], negative [[h|9%]]",
              "Negative topics: feedback timing [[i|27%]], workload [[j|22%]], timetabling [[k|18%]], other [[l|33%]]"
            ]
          },
          points: { i: 10, j: 5, h: 5, k: 2, c: -5, d: -3, e: -3, a: -2, b: -2 },
          key: "i",
          modelHeadline: "Late assessment feedback is the biggest single complaint — fix that first.",
          why: "The department asked what to FIX, not how good your model is. The model's accuracy is your achievement — it's the least useful number for this audience. Feedback timing (27% of complaints) answers the question; workload (22%) shows it's a close call; negative share (9%) shows the scale."
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w3-l2",
      type: "jargon",
      title: "Jargon Jail",
      blurb: "Rewrite inflated paragraphs. Live meters tell you when you're free.",
      minutes: 15,
      paragraphs: [
        {
          id: "jj1", project: "ReAdmit", label: "Methods paragraph",
          original: "In order to holistically address the multifaceted challenge of readmission prediction, this study leverages a robust machine learning paradigm. Initially, the classifier was trained utilising a comprehensive set of 37 clinical and demographic features. Subsequently, the algorithm was rigorously optimised via 5-fold cross-validation, which seamlessly ensures the generalisability of the framework. Furthermore, to tackle the inherent class imbalance (11.6% positive), the predictor employed class weighting. Ultimately, the XGBoost system delivered a cutting-edge AUROC of 0.86, thereby showcasing the transformative potential of the model in revolutionising healthcare delivery.",
          targetWords: 60,
          synonyms: ["model", "classifier", "algorithm", "framework", "predictor", "system", "paradigm"],
          facts: [
            { label: "XGBoost", any: ["xgboost"] },
            { label: "37 features", any: ["37", "thirty-seven"] },
            { label: "5-fold CV", any: ["5-fold", "five-fold", "5 fold", "five fold"] },
            { label: "11.6% readmitted", any: ["11.6"] },
            { label: "class weights", any: ["weight"] },
            { label: "AUROC 0.86", any: ["0.86"] }
          ],
          model: "We trained XGBoost on 37 clinical and demographic features, tuned it with 5-fold cross-validation, and used class weights because only 11.6% of patients were readmitted. The model reached an AUROC of 0.86 on the held-out test set.",
          lesson: "Notice what disappeared besides the jargon: the claim that cross-validation 'ensures generalisability'. It doesn't. Inflated language often hides a false claim — removing it forces you to check."
        },
        {
          id: "jj2", project: "Humber Flood Watch", label: "Introduction paragraph",
          original: "In today's rapidly evolving climate landscape, flooding represents a pivotal challenge for the city of Hull. This project delves into the intricate realm of hydrological forecasting, harnessing the power of deep learning to navigate the complexities of river level prediction. Leveraging hourly data from 6 gauges spanning 2015 to 2024, the proposed framework seamlessly integrates an LSTM network alongside a LightGBM model. Crucially, the system is benchmarked against a persistence baseline, underscoring its ability to forecast levels up to 24 hours ahead with unprecedented accuracy.",
          targetWords: 55,
          synonyms: ["framework", "system", "solution", "tool", "pipeline", "approach"],
          facts: [
            { label: "6 gauges", any: ["6 ", "six", "6-"] },
            { label: "2015–2024", any: ["2015"] },
            { label: "LSTM", any: ["lstm"] },
            { label: "LightGBM", any: ["lightgbm"] },
            { label: "Persistence baseline", any: ["persistence"] },
            { label: "24 hours ahead", any: ["24"] }
          ],
          model: "Much of Hull lies low and floods from the River Hull. We forecast river levels up to 24 hours ahead from hourly data at six gauges (2015–2024), comparing an LSTM and LightGBM against a persistence baseline, which simply assumes the level stays where it is.",
          lesson: "'Unprecedented accuracy' vanished — because nothing in the project supports it. And explaining what 'persistence baseline' means in eight plain words does more for the reader than any adjective."
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w3-l3",
      type: "flash",
      title: "Ten-Second Slide",
      blurb: "The slide vanishes after 10 seconds. Now say what it means — without it.",
      minutes: 8,
      seconds: 10,
      writeSeconds: 75,
      slides: [
        {
          id: "fs1", project: "ReAdmit",
          slide: { title: "XGBoost catches 3 in 4 readmissions — up from under 6 in 10", chart: { type: "bar", label: "Recall on held-out test set", unit: "", max: 1, data: [["Logistic regression", 0.58], ["Random forest", 0.61], ["XGBoost", 0.74]], highlight: 2 }, bullets: ["Cost: about 3 false alarms for every 2 real cases"] },
          keywords: ["recall", "catch", "readmi", "miss", "find", "false alarm"],
          model: "Our best model finds three out of every four patients who end up readmitted, which is a clear step up from the simple baseline. The price is false alarms — for every two real cases, the team phones about three people who would have been fine. So whether it's useful depends on how many calls the ward can make."
        },
        {
          id: "fs2", project: "ReAdmit",
          slide: { title: "Results Overview", bullets: ["XGBoost: Accuracy 0.89, Precision 0.41, Recall 0.74, F1 0.53, AUROC 0.86, PR-AUC 0.52", "Random Forest: Accuracy 0.90, Precision 0.44, Recall 0.61, F1 0.51, AUROC 0.84, PR-AUC 0.49", "Logistic Regression: Accuracy 0.83, Precision 0.33, Recall 0.58, F1 0.42, AUROC 0.79, PR-AUC 0.40", "5-fold CV, 300 trees, learning rate 0.05, max depth 6, training time 3.2 min"] },
          keywords: ["xgboost", "recall", "best", "precision", "trade", "rare"],
          model: "Honestly, you can't take in a slide like this in ten seconds — and neither can an examiner. What I'd say is: XGBoost finds the most readmitted patients, and that's the measure that matters here because readmissions are rare. Everything else on this slide belongs in an appendix.",
          lesson: "If you couldn't remember it, that's the point. Your audience can't either. A slide you can't summarise from memory is a slide you'll end up reading aloud."
        },
        {
          id: "fs3", project: "Humber Flood Watch",
          slide: { title: "At flood peaks, the LSTM errs by 12 cm — 4 cm less than LightGBM", chart: { type: "bar", label: "Error on top 5% of river levels, 24 h ahead (cm)", unit: " cm", max: 25, data: [["Persistence", 21.4], ["LightGBM", 15.7], ["LSTM", 12.1]], highlight: 2 } },
          keywords: ["peak", "flood", "lstm", "warning", "high", "day ahead", "24"],
          model: "When the river is at its highest — which is when a warning actually matters — the LSTM's day-ahead forecast is closest to reality. That's the reason we'd pick it for warnings, even though LightGBM is slightly better on ordinary days."
        }
      ]
    }
  ]
});
