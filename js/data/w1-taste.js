/* ==========================================================================
   WORLD 1 — TASTE: learn what good looks like
   All projects, people and data in JUDGE Arena are fictional.
   "origin" records how each example was produced for teaching:
     ai          = written as a typical AI output (some from careful prompts, some lazy)
     human       = written to reflect typical student work
     ai-assisted = a student draft polished by AI
   ========================================================================== */
window.JUDGE = window.JUDGE || {};
JUDGE.worlds = JUDGE.worlds || [];

JUDGE.worlds.push({
  id: "w1",
  num: 1,
  name: "Taste",
  tagline: "Learn what good looks like",
  intro: "You can't judge AI output if you don't know what good looks like. Rate each example on quality first. Only then guess where it came from — and bet on how sure you are.",
  colour: "teal",
  levels: [
    /* ---------------------------------------------------------------- */
    {
      id: "w1-l1",
      type: "rate",
      title: "Blind Taste Test",
      blurb: "Rate 9 reports, code cells and slides. Then guess: AI, human, or AI-assisted?",
      minutes: 15,
      criteria: [
        { id: "clarity", label: "Clear", hint: "Could a classmate follow it first time?" },
        { id: "accuracy", label: "Accurate", hint: "Are the claims true and supported?" },
        { id: "specific", label: "Specific to this project", hint: "Or could it describe any project?" }
      ],
      items: [
        {
          id: "t1", kind: "report", project: "ReAdmit",
          label: "Methods paragraph",
          content: [
            "In this study, a robust and comprehensive machine learning framework was leveraged to holistically predict hospital readmissions. Various state-of-the-art algorithms were employed, including advanced ensemble methods, in order to capture the complex and multifaceted relationships within the data. The models were rigorously evaluated using a variety of industry-standard metrics, ensuring that the results are both reliable and generalisable. Overall, this approach provides valuable insights that could significantly enhance patient outcomes and streamline healthcare delivery."
          ],
          expert: { clarity: 2, accuracy: 2, specific: 1 },
          origin: "ai",
          pros: ["Grammatical and fluent", "Follows the expected shape of a methods paragraph"],
          cons: ["Names no model, no dataset size, no metric — it could describe any project", "Claims the results are 'generalisable' with no evidence", "Inflated vocabulary (robust, holistically, multifaceted) hides the absence of content", "This is the 'average of everything' paragraph: fluent, safe, and empty"]
        },
        {
          id: "t2", kind: "report", project: "ReAdmit",
          label: "Evaluation paragraph",
          content: [
            "We trained three models on 4,812 discharges from one trust (2019–2022): logistic regression as a baseline, a random forest, and XGBoost. Only 11.6% of patients were readmitted within 30 days, so accuracy is misleading here: a model that predicts 'no readmission' for everyone scores 88.4%. We therefore report recall and PR-AUC. XGBoost reached a recall of 0.74 against 0.58 for the baseline, but its precision was only 0.41, which means roughly three false alarms for every two real readmissions. Whether that trade-off is acceptable depends on how many calls the discharge team can make, which we discuss in Section 5."
          ],
          expert: { clarity: 5, accuracy: 5, specific: 5 },
          origin: "human",
          pros: ["Explains WHY accuracy is the wrong metric, with the actual numbers", "Translates precision into something a nurse understands (false alarms per real case)", "Admits the trade-off instead of hiding it"],
          cons: ["Long-ish for one paragraph", "Forward reference to Section 5 makes the reader wait for the 'so what'"]
        },
        {
          id: "t3", kind: "code", project: "ReAdmit",
          label: "Notebook cell: baseline model",
          content: `from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

RANDOM_STATE = 42

# Hold out a test set first, stratified so both splits keep the 11.6% readmission rate
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
)

# Imputation and scaling live inside the pipeline, so they are fitted on
# training folds only and never see validation or test data
baseline = Pipeline([
    ("impute", SimpleImputer(strategy="median")),
    ("scale", StandardScaler()),
    ("model", LogisticRegression(class_weight="balanced", max_iter=1000)),
])

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
scores = cross_val_score(baseline, X_train, y_train, cv=cv, scoring="average_precision")
print(f"PR-AUC (5-fold): {scores.mean():.3f} ± {scores.std():.3f}")`,
          expert: { clarity: 5, accuracy: 4, specific: 4 },
          origin: "ai",
          pros: ["Preprocessing inside a Pipeline, so no leakage from scaling or imputation", "Stratified split and a fixed seed — reproducible", "Uses PR-AUC, which suits an imbalanced outcome"],
          cons: ["The subtle miss: the same patient can appear in several discharges. A random split can put one patient in both train and test. A group split by patient ID is needed — and only someone who knows the data would spot it", "Good code is not the same as correct analysis"]
        },
        {
          id: "t4", kind: "code", project: "ReAdmit",
          label: "Notebook cell: random forest",
          content: `df = pd.read_csv('C:/Users/student/Desktop/final_FINAL/readmit2.csv')
df = df.dropna()
sc = StandardScaler()
X = sc.fit_transform(df.drop('readmit', axis=1))
y = df['readmit']
#X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25)
m = RandomForestClassifier(n_estimators=500)
m.fit(X_train, y_train)
print(m.score(X_test, y_test))   # 0.89 !!!`,
          expert: { clarity: 2, accuracy: 1, specific: 3 },
          origin: "human",
          pros: ["Short and honest — you can see exactly what was done", "Shows a real working process (the commented-out line)"],
          cons: ["Hard-coded local path — nobody else can run it", "dropna() silently throws away every row with a missing lab value (18% of lab values are missing — how many rows went?)", "Scaler fitted on ALL data before the split: leakage", "No stratify, no random seed", "Celebrates 0.89 accuracy when predicting 'nobody is readmitted' already scores 0.884"]
        },
        {
          id: "t5", kind: "slide", project: "ReAdmit",
          label: "Results slide",
          content: {
            title: "Results Overview",
            bullets: [
              "XGBoost: Accuracy 0.89, Precision 0.41, Recall 0.74, F1 0.53, AUROC 0.86, PR-AUC 0.52",
              "Random Forest: Accuracy 0.90, Precision 0.44, Recall 0.61, F1 0.51, AUROC 0.84, PR-AUC 0.49",
              "Logistic Regression: Accuracy 0.83, Precision 0.33, Recall 0.58, F1 0.42, AUROC 0.79, PR-AUC 0.40",
              "5-fold CV, 300 trees, learning rate 0.05, max depth 6, training time 3.2 min",
              "Key insight: XGBoost demonstrates superior performance across most metrics, highlighting its robustness."
            ]
          },
          expert: { clarity: 1, accuracy: 3, specific: 3 },
          origin: "ai",
          pros: ["Everything is there — nothing is hidden", "Consistent formatting"],
          cons: ["Over 25 numbers: the audience can't tell which one matters", "Title says 'Results' — it should say what the result IS", "'Superior across most metrics' is shaky: the random forest has higher accuracy and precision", "'Robustness' is claimed, never shown", "This is the slide students then read aloud in the viva"]
        },
        {
          id: "t6", kind: "slide", project: "ReAdmit",
          label: "Results slide",
          content: {
            title: "XGBoost catches 3 in 4 readmissions — up from under 6 in 10",
            chart: { type: "bar", label: "Recall on held-out test set", unit: "", max: 1, data: [["Logistic regression", 0.58], ["Random forest", 0.61], ["XGBoost", 0.74]], highlight: 2 },
            bullets: ["Cost: about 3 false alarms for every 2 real cases"],
            footer: "Held-out test set (n = 963). Full metrics in appendix."
          },
          expert: { clarity: 5, accuracy: 5, specific: 5 },
          origin: "human",
          pros: ["The title IS the finding", "One chart, one metric, chosen because it answers the question", "Names the cost honestly", "Full detail is still available (appendix)"],
          cons: ["Title is long", "Needs the presenter to say why recall matters more than accuracy here"]
        },
        {
          id: "t7", kind: "report", project: "ReAdmit",
          label: "Limitations paragraph",
          content: [
            "Three limitations bound these results. First, all 4,812 discharges come from a single trust between 2019 and 2022, a period that includes the COVID-19 disruption to admissions; performance at another trust, or after 2022, is untested. Second, 18% of laboratory values were missing and were imputed with the median; if values are missing because a test was not ordered, missingness itself may carry information that median imputation discards. Third, the outcome counts readmissions to the same trust only, so patients readmitted elsewhere are recorded as negatives, which likely understates the true readmission rate."
          ],
          expert: { clarity: 5, accuracy: 5, specific: 5 },
          origin: "ai",
          pros: ["Every limitation is specific to THIS data", "Explains the consequence of each limitation, not just its existence", "The point about missing-not-at-random lab values is genuinely sharp"],
          cons: ["Slightly stiff opening line", "Doesn't say what would be done about any of them", "Twist: this came from a careful prompt that included the project details. AI output is as good as the context it is given"]
        },
        {
          id: "t8", kind: "slide", project: "ReAdmit",
          label: "Methods slide",
          content: {
            title: "Methodology and Data Preprocessing Steps",
            bullets: [
              "The dataset was downloaded and then cleaned by removing the null values and also outliers were removed using IQR method and then normalisation was done",
              "Then we did the feature selection using correlation and also chi square and RFE and some features were dropped because they were not important",
              "Different models were trained like LR, RF, XGB, SVM and KNN and the best one was XGB as it gave the best results in comparison to others",
              "Hyperparameter tuning was done with GridSearch for better accuracy"
            ]
          },
          expert: { clarity: 2, accuracy: 2, specific: 3 },
          origin: "human",
          pros: ["Honest record of what was actually done", "Names real methods (IQR, RFE, GridSearch)"],
          cons: ["Paragraphs on a slide — the audience reads instead of listening", "Removing 'outliers' from clinical data may remove the sickest patients — the ones that matter", "'Best results' and 'better accuracy' — best by which metric?", "Says WHAT was done, never WHY"]
        },
        {
          id: "t9", kind: "report", project: "Humber Flood Watch",
          label: "Introduction paragraph",
          content: [
            "River flooding is a serious concern for Hull, where much of the city lies below the high-tide line. This project develops a forecasting system to predict water levels on the River Hull up to 24 hours ahead. The proposed framework leverages hourly readings from six gauges between 2015 and 2024. Our model is compared with a persistence baseline, and the algorithm's performance is assessed using mean absolute error. The predictor achieves strong results, demonstrating the potential of deep learning for flood resilience."
          ],
          expert: { clarity: 3, accuracy: 3, specific: 3 },
          origin: "ai-assisted",
          pros: ["The first half is concrete: place, horizon, data, baseline, metric", "Short"],
          cons: ["System, framework, model, algorithm, predictor — five words for one thing. Classic sign of AI polishing a draft", "'Strong results' — how strong? Compared to what?", "Claims deep learning shows the potential, but the project's best 6-hour model is LightGBM, not deep learning", "The specific half reads like the student; the vague half reads like the polish"]
        }
      ]
    },
    /* ---------------------------------------------------------------- */
    {
      id: "w1-l2",
      type: "duel",
      title: "Pairwise Duel",
      blurb: "7 head-to-heads. Pick the better one and say why.",
      minutes: 10,
      reasons: [
        { id: "takeaway", label: "States a clear takeaway" },
        { id: "specific", label: "Specific to this project" },
        { id: "honest", label: "Honest about limitations" },
        { id: "numbers", label: "Numbers support a claim (not decoration)" },
        { id: "terms", label: "Consistent terminology" },
        { id: "repro", label: "Reproducible, checkable code" }
      ],
      duels: [
        {
          id: "d1", kind: "slide-title",
          prompt: "Two titles for the same results slide.",
          a: { kind: "text", content: "Results", origin: "human" },
          b: { kind: "text", content: "Reweighting the rare class lifted recall from 0.58 to 0.74", origin: "ai" },
          better: "b", reason: "takeaway",
          why: "A title should be the finding, not the section name. 'Results' forces the audience to work out the point themselves — and in a viva, it invites you to read every number aloud."
        },
        {
          id: "d2", kind: "report",
          prompt: "Two limitations paragraphs.",
          a: { kind: "text", content: "This study has some limitations. The dataset may not be representative of all populations, and future work could explore additional features and advanced models to further improve performance.", origin: "ai" },
          b: { kind: "text", content: "All 4,812 discharges come from one trust between 2019 and 2022, including the COVID-19 period, so we cannot say how the model performs at other trusts or after 2022. Readmissions to other hospitals are also missing, so the true rate is probably higher than 11.6%.", origin: "human" },
          better: "b", reason: "specific",
          why: "A only says what every limitations section says. B names the actual boundary of the evidence and what follows from it. Examiners can tell the difference instantly."
        },
        {
          id: "d3", kind: "code",
          prompt: "Two ways to load and split the data.",
          a: { kind: "code", content: "df = pd.read_csv('/Users/sam/Downloads/data (3).csv')\nX_train, X_test, y_train, y_test = train_test_split(X, y)", origin: "human" },
          b: { kind: "code", content: "DATA = Path('data') / 'readmit.csv'\nSEED = 42\n\ndf = pd.read_csv(DATA)\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, stratify=y, random_state=SEED)", origin: "ai" },
          better: "b", reason: "repro",
          why: "B can be run by anyone with the repo, gives the same split every time, and keeps the class balance. A works on one laptop, once."
        },
        {
          id: "d4", kind: "report",
          prompt: "Two justifications for the choice of metric.",
          a: { kind: "text", content: "We used the F1-score because it is the harmonic mean of precision and recall and is widely used in machine learning.", origin: "ai" },
          b: { kind: "text", content: "We report PR-AUC rather than accuracy because only 11.6% of patients were readmitted; PR-AUC only rewards a model for finding those rare cases (Saito & Rehmsmeier, 2015).", origin: "human" },
          better: "b", reason: "specific",
          why: "A is a textbook definition — true, but it doesn't justify anything about THIS project. B ties the choice to a fact about the data and cites a source that genuinely supports it."
        },
        {
          id: "d5", kind: "report",
          prompt: "Two versions of the same sentence pair.",
          a: { kind: "text", content: "The classifier was trained on 37 features. The framework was then tuned with 5-fold cross-validation, and the algorithm reached an AUROC of 0.86, showing the system works well.", origin: "ai" },
          b: { kind: "text", content: "We trained the model on 37 features and tuned it with 5-fold cross-validation. The model reached an AUROC of 0.86 on the held-out test set.", origin: "human" },
          better: "b", reason: "terms",
          why: "In A, a reader could fairly ask whether the classifier, framework, algorithm and system are four different things. Pick one word and keep it. B also says WHERE the 0.86 was measured; A just says it 'works well'."
        },
        {
          id: "d6", kind: "slide",
          prompt: "Two slides for the same flood-forecasting result.",
          a: { kind: "slide", origin: "ai", content: { title: "Model Comparison", table: { head: ["Model", "MAE 6 h", "MAE 24 h", "Peak MAE 24 h", "Train time"], rows: [["Persistence", "9.8 cm", "19.6 cm", "21.4 cm", "—"], ["LightGBM", "6.1 cm", "14.9 cm", "15.7 cm", "42 s"], ["LSTM", "6.4 cm", "13.2 cm", "12.1 cm", "38 min"]] } } },
          b: { kind: "slide", origin: "human", content: { title: "At flood peaks, the LSTM errs by 12 cm — 4 cm less than LightGBM", chart: { type: "bar", label: "Error on top 5% of river levels, 24 h ahead (cm)", unit: " cm", max: 25, data: [["Persistence", 21.4], ["LightGBM", 15.7], ["LSTM", 12.1]], highlight: 2 }, footer: "Lower is better. All horizons in appendix." } },
          better: "b", reason: "numbers",
          why: "A is a data dump: correct, but the audience has to find the story. B picks the numbers that matter for flood WARNINGS (peaks, a day ahead) and makes them the headline."
        },
        {
          id: "d7", kind: "viva",
          prompt: "A viva question: 'What does SHAP tell you?' Two answers.",
          a: { kind: "text", content: "SHAP values are based on cooperative game theory and fairly distribute the prediction among the features, providing both local and global interpretability.", origin: "ai" },
          b: { kind: "text", content: "For patient 1182, the risk went up mostly because of four admissions in the past year and going home alone. SHAP splits each prediction into how much each feature pushed it up or down from the average patient.", origin: "human" },
          better: "b", reason: "specific",
          why: "A is fluent and correct — and could be recited without understanding anything. B proves the student has actually looked inside their own model. This is exactly the gap examiners probe in a viva."
        }
      ]
    }
  ]
});
