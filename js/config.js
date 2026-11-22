/* ==========================================================================
   JUDGE Arena — configuration
   Edit this file to set up cohorts, the instructor code and (optionally) Supabase.
   ========================================================================== */
window.JUDGE = window.JUDGE || {};

JUDGE.config = {
  appName: "JUDGE Arena",

  // Students choose a trimester and an academic year. Together they form the
  // cohort key, e.g. "T1|25/26", used for storage, the leaderboard and the dashboard.
  // NOTE: on a static site these are a door, not a lock. Anyone who reads the
  // page source can see them. Use Supabase (below) for real accounts.
  trimesters: [
    { code: "T1", label: "Trimester 1" },
    { code: "T2", label: "Trimester 2" },
    { code: "T3", label: "Trimester 3" }
  ],
  years: [
    { code: "25/26", label: "2025/26" },
    { code: "26/27", label: "2026/27" },
    { code: "older", label: "Earlier year" }
  ],
  copyAllowance: 2,          // copies allowed before copying is blocked (see section 7)
  blockPasteInAnswers: false, // if true, pasting into answer boxes is blocked too

  // Instructor code: unlocks all worlds and the QR / class tools on this device.
  // Change this before you publish.
  instructorCode: "JA-staff1234",

  // Optional link back to the JUDGE / DAIM site, shown in the footer.
  judgeSiteUrl: "",

  // ---- Optional: Supabase for real accounts, a class leaderboard and a
  // ---- class progress dashboard. See supabase/schema.sql and README.md.
  supabase: {
    enabled: true,   // needs supabase/schema.sql (version 2) to have been run in your project first
    url: "https://rxvvkoyjrlrbtsqpytwr.supabase.co",      // e.g. "https://abcd1234.supabase.co"
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dnZrb3lqcmxyYnRzcXB5dHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTMzNjUsImV4cCI6MjEwODMyOTM2NX0.QvgCj5F8tg_-BIyDMS5QKxa8TDxnSSelIsaRzvt1FzM"   // the project's publishable / anon key (safe to ship in the browser)
  }
};
