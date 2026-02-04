/**
 * FYP Scoring Algorithm
 * 
 * Computes a relevance score for each log based on:
 * - Interest Score (0.45): follows, topic overlap, recent interactions
 * - Engagement Quality (0.25): likes, comments weighted with log saturation
 * - Recency (0.20): exponential decay over 36-48 hours
 * - Credibility (0.10): author's posting consistency and quality
 * - Freshness Boost: temporary boost for new posts with low engagement
 */

interface ScoringInput {
  log: {
    id: string;
    user_id: string;
    created_at: string;
    likes_count: number;
    comments_count: number;
    relogs_count: number;
  };
  currentUserId: string | null;
  followingIds: Set<string>;
  recentInteractedAuthorIds: Set<string>;
  authorPostCounts: Map<string, number>; // For credibility
}

// Weights from spec
const INTEREST_WEIGHT = 0.45;
const ENGAGEMENT_WEIGHT = 0.25;
const RECENCY_WEIGHT = 0.20;
const CREDIBILITY_WEIGHT = 0.10;

// Interest sub-weights
const FOLLOWS_AUTHOR_WEIGHT = 0.35;
const RECENT_INTERACTION_WEIGHT = 0.20;
// Topic overlap would require content analysis - simplified to random factor for now

// Engagement weights
const LIKE_SCORE = 1;
const COMMENT_SCORE = 3;
const RELOG_SCORE = 4;

// Decay window in hours
const DECAY_HALF_LIFE_HOURS = 42; // Middle of 36-48 range

// Freshness boost parameters
const FRESHNESS_HOURS = 6;
const FRESHNESS_BOOST_MAX = 0.05;
const LOW_ENGAGEMENT_THRESHOLD = 5;

export function calculateLogScore(input: ScoringInput): number {
  const { log, currentUserId, followingIds, recentInteractedAuthorIds, authorPostCounts } = input;

  // 1. Interest Score (0-1)
  let interestScore = 0;
  
  if (currentUserId) {
    // User follows author
    if (followingIds.has(log.user_id)) {
      interestScore += FOLLOWS_AUTHOR_WEIGHT;
    }
    
    // Recent interaction with author
    if (recentInteractedAuthorIds.has(log.user_id)) {
      interestScore += RECENT_INTERACTION_WEIGHT;
    }
    
    // Add small random factor for topic overlap (placeholder for future content analysis)
    interestScore += Math.random() * 0.15;
  } else {
    // For logged-out users, give base interest
    interestScore = 0.3 + Math.random() * 0.2;
  }
  
  interestScore = Math.min(1, interestScore);

  // 2. Engagement Quality Score (0-1) with logarithmic saturation
  const rawEngagement = 
    (log.likes_count * LIKE_SCORE) +
    (log.comments_count * COMMENT_SCORE) +
    (log.relogs_count * RELOG_SCORE);
  
  // Logarithmic saturation to prevent viral domination
  // log(1 + x) / log(1 + MAX) normalized to 0-1
  const MAX_ENGAGEMENT = 1000; // Saturation point
  const engagementScore = Math.log(1 + rawEngagement) / Math.log(1 + MAX_ENGAGEMENT);

  // 3. Recency Score (0-1) with exponential decay
  const ageHours = (Date.now() - new Date(log.created_at).getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.pow(0.5, ageHours / DECAY_HALF_LIFE_HOURS);

  // 4. Author Credibility Score (0-1)
  const authorPosts = authorPostCounts.get(log.user_id) || 1;
  // More posts = higher credibility, capped at 1
  // This is simplified - could include spam detection, engagement history, etc.
  const credibilityScore = Math.min(1, Math.log(1 + authorPosts) / Math.log(20));

  // 5. Freshness Boost (for posts < 6 hours old with low engagement)
  let freshnessBoost = 0;
  if (ageHours < FRESHNESS_HOURS && rawEngagement < LOW_ENGAGEMENT_THRESHOLD) {
    // Linear decay of boost over freshness window
    freshnessBoost = FRESHNESS_BOOST_MAX * (1 - ageHours / FRESHNESS_HOURS);
  }

  // Final weighted score
  const finalScore =
    (interestScore * INTEREST_WEIGHT) +
    (engagementScore * ENGAGEMENT_WEIGHT) +
    (recencyScore * RECENCY_WEIGHT) +
    (credibilityScore * CREDIBILITY_WEIGHT) +
    freshnessBoost;

  return finalScore;
}

/**
 * Sort logs by computed score
 */
export function sortLogsByScore(
  logs: ScoringInput["log"][],
  currentUserId: string | null,
  followingIds: Set<string>,
  recentInteractedAuthorIds: Set<string>,
  authorPostCounts: Map<string, number>
): ScoringInput["log"][] {
  const scoredLogs = logs.map((log) => ({
    log,
    score: calculateLogScore({
      log,
      currentUserId,
      followingIds,
      recentInteractedAuthorIds,
      authorPostCounts,
    }),
  }));

  // Sort by score descending, then by created_at for ties
  scoredLogs.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 0.001) {
      return new Date(b.log.created_at).getTime() - new Date(a.log.created_at).getTime();
    }
    return b.score - a.score;
  });

  return scoredLogs.map((s) => s.log);
}
