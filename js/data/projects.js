/* ==========================================================================
   Project briefs. Shown in the "About this project" panel wherever a level
   displays a project tag. Edit here to change what students are told.
   ========================================================================== */
window.JUDGE = window.JUDGE || {};

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
