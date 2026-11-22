/* ==========================================================================
   Feedback questions: the optional card after each world, and the required
   questionnaire after the boss. Edit here to change the wording.
   ========================================================================== */
window.JUDGE = window.JUDGE || {};

(function () {
  const worlds = ["Taste", "Hunt", "Craft", "Defend", "Beyond the Prompt", "The final level"];
  JUDGE.FEEDBACK = {
    world: { prompt: "How useful was this world?", maxChars: 500 },
    final: {
      requiredUpTo: 8,
      questions: [
        { id: "q1", text: "Overall, how useful was JUDGE Arena for your learning?", type: "single", options: ["Very useful", "Useful", "Somewhat useful", "Not useful"] },
        { id: "q2", text: "Which world helped you most?", type: "single", options: worlds },
        { id: "q3", text: "Which world helped you least?", type: "single", options: worlds },
        { id: "q4", text: "After playing, how confident are you at spotting problems in AI-generated work?", type: "single", options: ["Much more confident", "A bit more", "No change", "Less confident"] },
        { id: "q5", text: "Will you change how you use AI in your coursework? (tick all that apply)", type: "multi", exclusive: "I won't change anything",
          options: ["Check numbers against my code more", "Check citations before using them", "Write my own draft before prompting", "Cut filler and jargon from AI text", "Prepare to explain my choices without notes", "I won't change anything"] },
        { id: "q6", text: "How difficult was it?", type: "single", options: ["Too easy", "About right", "Too hard"] },
        { id: "q7", text: "How long did it take overall?", type: "single", options: ["Too short", "About right", "Too long"] },
        { id: "q8", text: "Would you recommend it to next year's students?", type: "single", options: ["Yes", "Maybe", "No"] },
        { id: "q9", text: "Anything else you'd like to tell us? (optional)", type: "text", maxChars: 1000 }
      ]
    }
  };
})();
