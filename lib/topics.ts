// Safe, generic topics for unsupervised auto-posting - no invented stats, prices, or promises.
// Edit this list any time to fit what you actually want Vasukii's automatic posts to talk about.
export const TOPICS = [
  "Remind the community what Vasukii's philosophy 'Connect, Share, Evolve' means",
  "Invite people to visit the Vasukii website to learn more and get involved",
  "Share a general safety tip for staying secure in crypto communities, like never sharing a seed phrase",
  "Celebrate the Vasukii community and welcome newcomers to join the conversation",
  "Highlight the idea of connecting people through the Vasukii community",
  "Encourage followers to share Vasukii with a friend who might be interested",
  "Talk about the value of being active and engaged in a growing community",
  "Thank the community for their continued support and engagement",
  "Invite people to check the Vasukii website for the latest updates",
  "Share an inspiring thought about growth and evolving together",
  "Ask the community an engaging question about what they'd like to see next",
  "Highlight transparency and community-first values",
  "Remind everyone to only trust official channels and watch out for scams and impersonators",
  "Encourage people to introduce themselves in the community and say hello",
];

// Deterministic-ish rotation by half-hour window, so back-to-back runs don't repeat, with a
// little randomness mixed in so it's not on a perfectly rigid pattern.
export function pickTopic(): string {
  const slot = Math.floor(Date.now() / (1000 * 60 * 30));
  const idx = (slot + Math.floor(Math.random() * 3)) % TOPICS.length;
  return TOPICS[idx];
}
