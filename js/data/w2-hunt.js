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
  debrief: {
    challenge: "Unchecked claims. AI write-ups invent or \"improve\" numbers, describe steps the code never ran, cite papers that don't say what's claimed (or don't exist), and turn correlations into causes. All of it reads as confidently as the true sentences.",
    practised: "Checking every sentence against the code, its output and the sources, and deciding whether each claim is supported, contradicted or unsupported.",
    improve: [
      "Every number in your report should point to a notebook cell that printed it.",
      "Only cite papers you've opened, and check the relevant section says what you're citing it for. Look up any unfamiliar reference in Google Scholar before keeping it.",
      "Review your methods section with the notebook open beside it: does the code really do each step you describe?",
      "Treat \"proves\", \"causes\", \"all\" and \"every\" as red flags that need evidence."
    ]
  },
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w2-l1",
      type: "claimcheck",
      title: "Hallucination Hunt",
      blurb: "Four notebook cells, five AI sentences each. Find the two hallucinations in every cell.",
      minutes: 15,
      howTo: "The ReAdmit student asked an AI to write up their results from four notebook cells. For each cell you'll see the code, what it printed, and five sentences from the AI's write-up. Exactly two of the five are hallucinations: they claim something the code, its output, the project facts or the reference list don't support. Find both. Everything you need is on screen.",
      project: "ReAdmit",
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
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w2-l2",
      type: "court",
      title: "Claim Courtroom",
      blurb: "8 claims from a report. Is each one supported, contradicted, or unsupported by the notebook?",
      minutes: 12,
      howTo: "Eight claims from a flood-forecasting report and five notebook outputs. For each claim, decide: **supported** (an output shows it), **contradicted** (an output shows the opposite), or **no evidence** (nothing on screen shows it either way). For supported or contradicted, point to the cell.",
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
      type: "claimcheck",
      title: "Speaker-Notes Sweep",
      blurb: "Speaker notes for an NLP project. Find the two hallucinations in each of four cells.",
      minutes: 15,
      howTo: "Same as the Hallucination Hunt, but for a presentation. The Module Voice student wrote their speaker notes with AI help. Four notebook cells, five spoken lines each, two hallucinations per cell.",
      project: "Module Voice",
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
    }
  ]
});
