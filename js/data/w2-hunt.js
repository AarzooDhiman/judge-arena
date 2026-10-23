/* ==========================================================================
   WORLD 2 — HUNT: verification, not prompting
   ========================================================================== */
window.JUDGE = window.JUDGE || {};
JUDGE.worlds = JUDGE.worlds || [];

JUDGE.FLAW_TYPES = [
  { id: "mismatch", label: "Number doesn't match the code output" },
  { id: "fabricated", label: "Fabricated / unverifiable citation" },
  { id: "miscited", label: "Citation doesn't support the claim" },
  { id: "leakage", label: "Data leakage" },
  { id: "testtune", label: "Test set used for tuning" },
  { id: "causation", label: "Correlation presented as causation" },
  { id: "overclaim", label: "Over-claimed / over-generalised result" },
  { id: "terms", label: "Inconsistent terminology" },
  { id: "metric", label: "Headline metric hides the real performance" }
];

JUDGE.worlds.push({
  id: "w2",
  num: 2,
  name: "Hunt",
  tagline: "Verification, not prompting",
  intro: "Fluent text is not checked text. Each level hides planted flaws — the kind examiners find in real submissions. Flag only what you can justify: false flags cost points.",
  colour: "amber",
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w2-l1",
      type: "hunt",
      title: "Hallucination Hunt",
      blurb: "A results section and its notebook. 7 planted flaws. Find them.",
      minutes: 15,
      project: "ReAdmit",
      brief: "This results section was drafted with AI from the student's notebook. Click any sentence or code line you think is wrong, then choose what kind of problem it is. The output panel is what the notebook actually printed.",
      flawTypes: "default",
      panels: [
        {
          title: "Report — Section 4: Results", kind: "report", flaggable: true,
          segments: [
            { id: "r1", text: "Table 3 compares the three models on the held-out test set." },
            { id: "r2", text: "XGBoost achieved the highest AUROC of 0.91, compared with 0.84 for the random forest and 0.79 for logistic regression." },
            { id: "r3", text: "Because only 11.6% of patients were readmitted, we also report PR-AUC, which is more informative than the ROC curve on imbalanced data (Saito & Rehmsmeier, 2015)." },
            { id: "r4", text: "To address class imbalance, the minority class was oversampled with SMOTE (Breiman, 2001)." },
            { id: "r5", text: "Hyperparameters were tuned with a grid search, and the configuration with the best test-set AUROC was selected." },
            { id: "r6", text: "XGBoost reached a recall of 0.74, meaning it identified roughly three in four patients who were readmitted." },
            { id: "r7", text: "SHAP values (Lundberg & Lee, 2017) show that the number of admissions in the previous 12 months was the strongest predictor." },
            { id: "r8", text: "Living alone was the second most important feature, demonstrating that living alone causes readmission." },
            { id: "r9", text: "This is consistent with Henderson and Malik (2021), who found that social isolation doubled readmission risk across 40 NHS trusts." },
            { id: "r10", text: "Deployed across the NHS, the model would reduce 30-day readmissions by around 30%." },
            { id: "r11", text: "Precision was 0.41, so the discharge team would make roughly three unnecessary calls for every two patients who are genuinely at risk." },
            { id: "r12", text: "Performance at other trusts, and after 2022, has not been tested." }
          ]
        },
        {
          title: "Notebook — 04_models.ipynb", kind: "code", flaggable: true,
          segments: [
            { id: "c1", text: "smote = SMOTE(random_state=42)" },
            { id: "c2", text: "X_res, y_res = smote.fit_resample(X, y)" },
            { id: "c3", text: "X_train, X_test, y_train, y_test = train_test_split(" },
            { id: "c4", text: "    X_res, y_res, test_size=0.2, random_state=42)" },
            { id: "c5", text: "" },
            { id: "c6", text: "best_auc, best_params = 0, None" },
            { id: "c7", text: "for params in ParameterGrid(grid):" },
            { id: "c8", text: "    model = XGBClassifier(**params).fit(X_train, y_train)" },
            { id: "c9", text: "    auc = roc_auc_score(y_test, model.predict_proba(X_test)[:, 1])" },
            { id: "c10", text: "    if auc > best_auc:" },
            { id: "c11", text: "        best_auc, best_params = auc, params" },
            { id: "c12", text: "print(f\"Best test AUROC: {best_auc:.2f}\")" }
          ]
        },
        {
          title: "Output", kind: "output", flaggable: false,
          text: "Best test AUROC: 0.86"
        }
      ],
      flaws: [
        { id: "f1", segs: ["r2"], type: "mismatch", why: "The report says AUROC 0.91. The notebook printed 0.86. AI drafting tools often 'improve' numbers or pull them from a different run. Every number in a report should be traceable to an output." },
        { id: "f2", segs: ["r4"], type: "miscited", why: "Breiman (2001) is the random forest paper — a real paper, but it says nothing about SMOTE. SMOTE is Chawla et al. (2002). Real-but-wrong citations are harder to catch than fake ones." },
        { id: "f3", segs: ["c2", "c4"], type: "leakage", why: "SMOTE is applied to the whole dataset BEFORE the split. Synthetic points built from test patients end up in training, and synthetic points end up in the test set. Resample inside the training data only (e.g. an imblearn Pipeline)." },
        { id: "f4", segs: ["r5", "c9"], type: "testtune", why: "The grid search picks the configuration with the best TEST score. The test set is now part of model selection, so 0.86 is optimistic. Tune with cross-validation on the training set; touch the test set once." },
        { id: "f5", segs: ["r8"], type: "causation", why: "Feature importance shows the model USES living alone to predict — not that living alone CAUSES readmission. It could stand in for age, frailty or lack of support at discharge." },
        { id: "f6", segs: ["r9"], type: "fabricated", why: "There is no Henderson and Malik (2021) study. This is a typical hallucinated citation: plausible authors, a plausible number, a plausible scale. If you can't find it in a database in two minutes, don't cite it." },
        { id: "f7", segs: ["r10"], type: "overclaim", why: "A model tested at one trust, on past data, cannot support a claim about the whole NHS — and predicting readmission is not the same as preventing it. The report's own last sentence contradicts this one." }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w2-l2",
      type: "court",
      title: "Claim Courtroom",
      blurb: "8 claims from a report. Is each one supported, contradicted, or unsupported by the notebook?",
      minutes: 12,
      project: "Humber Flood Watch",
      brief: "Humber Flood Watch forecasts River Hull levels 6 and 24 hours ahead. On the right are the notebook outputs. For each claim, give your verdict — and point to the evidence.",
      cells: [
        { id: "C1", title: "Cell 3 — data summary", text: "Rows: 87,672 (hourly, 2015-01-01 to 2024-12-31)\nGauges: 6\nMissing values: 0.7% overall\n  Sutton Road: 2,208 missing hours (2021-03-01 to 2021-05-31)\n  other gauges: < 0.5% each" },
        { id: "C2", title: "Cell 7 — persistence baseline", text: "Persistence (forecast = current level)\n  MAE  6 h:  9.8 cm\n  MAE 24 h: 19.6 cm" },
        { id: "C3", title: "Cell 12 — model results", text: "Model       MAE 6 h    MAE 24 h\nLightGBM    6.1 cm     14.9 cm\nLSTM        6.4 cm     13.2 cm" },
        { id: "C4", title: "Cell 13 — training time", text: "Training time (full data)\n  LightGBM: 42 s  (CPU)\n  LSTM:     38 min (GPU)" },
        { id: "C5", title: "Cell 15 — high-water events", text: "Error on top 5% of river levels (24 h ahead)\n  Persistence: 21.4 cm\n  LightGBM:    15.7 cm\n  LSTM:        12.1 cm" }
      ],
      claims: [
        { id: "k1", text: "LightGBM outperformed the LSTM at the 6-hour horizon (MAE 6.1 cm vs 6.4 cm).", verdict: "supported", cells: ["C3"], why: "Cell 12 shows exactly this." },
        { id: "k2", text: "The LSTM was the most accurate model at every forecast horizon.", verdict: "contradicted", cells: ["C3"], why: "At 6 hours LightGBM is better (6.1 vs 6.4). 'Every' is the word that makes it false — watch for absolute words in AI-drafted text." },
        { id: "k3", text: "Both learned models beat the persistence baseline at the 6-hour horizon.", verdict: "supported", cells: ["C2", "C3"], why: "Persistence MAE 9.8 cm (Cell 7) against 6.1 and 6.4 cm (Cell 12). Either cell is fair evidence; the best answer cites both." },
        { id: "k4", text: "The LSTM's advantage is largest during high-water events, which matter most for warnings.", verdict: "supported", cells: ["C5"], why: "At peaks the gap is 3.6 cm (15.7 vs 12.1), against 1.7 cm overall at 24 h. This is the claim that should drive the model choice." },
        { id: "k5", text: "Missing data was negligible across all six gauges.", verdict: "contradicted", cells: ["C1"], why: "Overall it's small (0.7%), but Sutton Road lost three continuous months. A three-month hole is not 'negligible' for a time-series model — 'overall' figures hide local problems." },
        { id: "k6", text: "The model was validated against the June 2007 Hull floods.", verdict: "contradicted", cells: ["C1"], why: "The data starts in 2015. The model could not have seen 2007. This is a fabricated validation — it sounds like the kind of thing a flood paper would say." },
        { id: "k7", text: "LightGBM trains in under a minute on a CPU, making weekly retraining practical.", verdict: "supported", cells: ["C4"], why: "42 s on CPU (Cell 13). The 'practical' part is a judgement, but a reasonable one from this evidence." },
        { id: "k8", text: "Adding rainfall radar data improved 24-hour accuracy by 12%.", verdict: "unsupported", cells: [], why: "Nothing in the notebook mentions rainfall radar. It might be true — but if there's no cell, it doesn't go in the report." }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w2-l3",
      type: "hunt",
      title: "Speaker-Notes Sweep",
      blurb: "A presentation script for an NLP project. 7 flaws, some subtle.",
      minutes: 15,
      project: "Module Voice",
      brief: "Module Voice classifies anonymised module-feedback comments as positive, neutral or negative. These are the presenter's speaker notes, written with AI help. Check them against the notebook and its output.",
      flawTypes: "default",
      panels: [
        {
          title: "Speaker notes", kind: "report", flaggable: true,
          segments: [
            { id: "s1", text: "We analysed 2,300 anonymised module-feedback comments from 2023–24." },
            { id: "s2", text: "After removing duplicates and empty responses, 1,840 comments remained." },
            { id: "s3", text: "We fine-tuned DistilBERT (Devlin et al., 2019) to classify each comment as positive, neutral or negative." },
            { id: "s4", text: "The model achieved 89% accuracy, so it classifies student sentiment almost perfectly." },
            { id: "s5", text: "Negative comments were most often about assessment feedback timing (31%)." },
            { id: "s6", text: "This shows that students hate assessment." },
            { id: "s7", text: "Polarity scores were then grouped by module, and emotion was highest in Year 1 modules." },
            { id: "s8", text: "Because the model understands what students feel, it could replace the module evaluation panel." },
            { id: "s9", text: "Comments from modules with fewer than 10 responses were excluded to protect anonymity." }
          ]
        },
        {
          title: "Notebook — 02_train.ipynb", kind: "code", flaggable: true,
          segments: [
            { id: "n1", text: "train_df, test_df = train_test_split(df, test_size=0.2, stratify=df['label'], random_state=7)" },
            { id: "n2", text: "train_df = train_df.drop_duplicates(subset='text')" },
            { id: "n3", text: "trainer = Trainer(model=model, args=args, train_dataset=to_ds(train_df), eval_dataset=to_ds(test_df))" },
            { id: "n4", text: "trainer.train()" },
            { id: "n5", text: "preds = trainer.predict(to_ds(test_df))" }
          ]
        },
        {
          title: "Output", kind: "output", flaggable: false,
          text: "accuracy: 0.89 | macro-F1: 0.71\nrecall  negative: 0.52  neutral: 0.61  positive: 0.98\nclass share (test): positive 78%  neutral 13%  negative 9%\n\nnegative comments by topic:\n  feedback timing 27% | workload 22% | timetabling 18% | other 33%"
        }
      ],
      flaws: [
        { id: "g1", segs: ["s3"], type: "miscited", why: "Devlin et al. (2019) introduced BERT. DistilBERT is Sanh et al. (2019). A near-miss citation — right family, wrong paper." },
        { id: "g2", segs: ["s4"], type: "metric", why: "89% accuracy sounds great, but 78% of comments are positive. Negative recall is 0.52: the model misses half of the complaints — the comments the department most needs to see." },
        { id: "g3", segs: ["s5"], type: "mismatch", why: "The output says 27%, not 31%." },
        { id: "g4", segs: ["s6"], type: "overclaim", why: "27% of the negative comments (which are 9% of all comments) mention feedback timing. That's 'feedback is often late', not 'students hate assessment'." },
        { id: "g5", segs: ["s7"], type: "terms", why: "Sentiment, polarity and emotion are used as if they're the same thing. The model predicts three sentiment classes — it doesn't measure 'emotion', so 'emotion was highest' has no meaning." },
        { id: "g6", segs: ["s8"], type: "overclaim", why: "The model doesn't 'understand' anything, misses half the negative comments, and the panel does far more than label sentiment. Anthropomorphic language is a red flag for over-claiming." },
        { id: "g7", segs: ["n2", "s2"], type: "leakage", why: "Duplicates are removed AFTER the split, and only from the training set. Identical comments (e.g. 'More feedback please') can sit in both train and test. The speaker notes claim deduplication happened first — the code says otherwise." }
      ]
    }
  ]
});
