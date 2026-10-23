/* ==========================================================================
   JUDGE Arena — configuration
   Edit this file to set up classes, the instructor code and (optionally) Supabase.
   ========================================================================== */
window.JUDGE = window.JUDGE || {};

JUDGE.config = {
  appName: "JUDGE Arena",

  // Class codes students can join with. The QR code for each class
  // links to this site with ?class=CODE so the code is filled in automatically.
  // NOTE: on a static site these codes are a door, not a lock. Anyone who
  // reads the page source can see them. Use Supabase (below) for real accounts.
  classes: [
    { code: "T1", label: "Trimester 1" },
    { code: "T2", label: "Trimester 2" },
    { code: "T3", label: "Trimester 3" },
    { code: "25/26", label: "Year" },
    { code: "26/27", label: "Year" },
    { code: "older", label: "Year" },
  ],

  // Set true to let students type any class code (handy for drop-in sessions).
  allowAnyClass: false,

  // Instructor code: unlocks all worlds and the QR / class tools on this device.
  // Change this before you publish.
  instructorCode: "staff@12345",

  // Optional link back to the JUDGE / DAIM site, shown in the footer.
  judgeSiteUrl: "",

  // ---- Optional: Supabase for real accounts, a class leaderboard and a
  // ---- class progress dashboard. See supabase/schema.sql and README.md.
  supabase: {
    enabled: true,
    url: "https://rxvvkoyjrlrbtsqpytwr.supabase.co",      // e.g. "https://abcd1234.supabase.co"
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dnZrb3lqcmxyYnRzcXB5dHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTMzNjUsImV4cCI6MjEwODMyOTM2NX0.QvgCj5F8tg_-BIyDMS5QKxa8TDxnSSelIsaRzvt1FzM"   // the project's publishable / anon key (safe to ship in the browser)
  }
};
