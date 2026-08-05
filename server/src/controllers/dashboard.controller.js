import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { db } from '../config/db.js';
import { 
  documents, quizzes, flashcards, userStats, userActivities, userAchievements, users
} from '../config/schema.js';

// Configuration constants for achievements
const ACHIEVEMENTS_LIST = [
  { id: 'first_upload', name: 'First Steps', desc: 'Upload your first study notes.', xp: 50 },
  { id: 'first_quiz', name: 'Trivia Buff', desc: 'Complete your first AI Quiz.', xp: 100 },
  { id: 'first_flashcards', name: 'Active Recall', desc: 'Review your first flashcard deck.', xp: 100 },
  { id: 'streak_3', name: 'Streak Starter', desc: 'Maintain a 3-day study streak.', xp: 200 },
  { id: 'streak_7', name: 'Streak Master', desc: 'Maintain a 7-day study streak.', xp: 500 },
  { id: 'perfectionist', name: 'Perfectionist', desc: 'Get 100% accuracy on a quiz.', xp: 300 },
  { id: 'academic_scholar', name: 'Academic Scholar', desc: 'Upload 5 or more documents.', xp: 250 },
];

/**
 * Get or create user stats helper
 */
const getOrCreateUserStats = async (userId) => {
  const [stats] = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (stats) return stats;

  const [newStats] = await db
    .insert(userStats)
    .values({
      userId,
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      studyTime: 0,
    })
    .returning();

  return newStats;
};

/**
 * Calculate level based on XP helper (Duolingo-style curves)
 */
const calculateLevel = (xp) => {
  // Level = Math.floor(sqrt(XP / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

/**
 * @desc    Log a user study activity (quiz completed, flashcard reviewed, chat sent)
 * @route   POST /api/dashboard/activity
 * @access  Private
 */
export const logActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { activityType, documentId, score, totalQuestions, duration, cardsReviewed } = req.body;

    if (!activityType) {
      return res.status(400).json({ error: 'Please provide activity type' });
    }

    // 1. Fetch current stats
    const stats = await getOrCreateUserStats(userId);

    // 2. Compute XP based on activity type
    let xpEarned = 10; // default for login/chat pings
    if (activityType === 'document_uploaded') {
      xpEarned = 50;
    } else if (activityType === 'quiz_completed') {
      // Score-based XP: 50 flat + 10 per correct answer
      xpEarned = 50 + (score || 0) * 10;
    } else if (activityType === 'flashcards_reviewed') {
      // Flashcard XP: 30 flat + 2 per card rated
      xpEarned = 30 + (cardsReviewed || 0) * 2;
    } else if (activityType === 'chat_message_sent') {
      xpEarned = 15;
    }

    // 3. Log activity history record
    await db.insert(userActivities).values({
      userId,
      activityType,
      documentId: documentId || null,
      score: score !== undefined ? score : null,
      totalQuestions: totalQuestions !== undefined ? totalQuestions : null,
      xpEarned,
      duration: duration || 0,
    });

    // 4. Update study streak and study duration
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentStreak = stats.streak;
    let longestStreak = stats.longestStreak;
    let streakReset = false;

    if (stats.lastStudyDate) {
      const lastStudy = new Date(stats.lastStudyDate);
      lastStudy.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastStudy.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Studied yesterday, increment streak
        currentStreak += 1;
      } else if (diffDays > 1) {
        // Broken streak, reset to 1
        currentStreak = 1;
        streakReset = true;
      }
      // If diffDays === 0: already studied today, streak remains same
    } else {
      // First activity
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // 5. Update user stats in DB
    const newXp = stats.xp + xpEarned;
    const oldLevel = stats.level;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > oldLevel;

    await db
      .update(userStats)
      .set({
        xp: newXp,
        level: newLevel,
        streak: currentStreak,
        longestStreak,
        studyTime: stats.studyTime + (duration || 0),
        lastStudyDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userStats.userId, userId));

    // 6. Check and unlock achievements
    const unlockedAchievements = [];

    const unlockAchievement = async (achievementId) => {
      const [existing] = await db
        .select()
        .from(userAchievements)
        .where(
          and(
            eq(userAchievements.userId, userId),
            eq(userAchievements.achievementId, achievementId)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(userAchievements).values({
          userId,
          achievementId,
        });

        // Award bonus XP for achievement unlock
        const badgeDef = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
        if (badgeDef) {
          await db
            .update(userStats)
            .set({
              xp: sql`xp + ${badgeDef.xp}`,
              updatedAt: new Date(),
            })
            .where(eq(userStats.userId, userId));

          unlockedAchievements.push({
            id: achievementId,
            name: badgeDef.name,
            desc: badgeDef.desc,
            bonusXp: badgeDef.xp,
          });
        }
      }
    };

    // Check specific conditions based on activity
    if (activityType === 'document_uploaded') {
      await unlockAchievement('first_upload');

      // Count total documents
      const docs = await db
        .select({ count: sql`count(*)` })
        .from(documents)
        .where(eq(documents.userId, userId));
      const totalDocs = parseInt(docs[0]?.count || '0', 10);
      if (totalDocs >= 5) {
        await unlockAchievement('academic_scholar');
      }
    } else if (activityType === 'quiz_completed') {
      await unlockAchievement('first_quiz');

      if (score === totalQuestions && totalQuestions >= 5) {
        await unlockAchievement('perfectionist');
      }
    } else if (activityType === 'flashcards_reviewed') {
      await unlockAchievement('first_flashcards');
    }

    // Check streak achievements
    if (currentStreak >= 3) {
      await unlockAchievement('streak_3');
    }
    if (currentStreak >= 7) {
      await unlockAchievement('streak_7');
    }

    res.status(200).json({
      xpEarned,
      newXp,
      newLevel,
      leveledUp,
      streak: currentStreak,
      longestStreak,
      unlockedAchievements,
    });
  } catch (error) {
    console.error('Error logging user activity:', error.message);
    res.status(500).json({ error: 'Server error logging study activity' });
  }
};

/**
 * @desc    Get cumulative metrics & daily/weekly goals progress (Overview summary)
 * @route   GET /api/dashboard/summary
 * @access  Private
 */
export const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const stats = await getOrCreateUserStats(userId);

    // Get basic counts
    const [docsCountResult] = await db
      .select({ count: sql`count(*)` })
      .from(documents)
      .where(eq(documents.userId, userId));

    const userDocuments = await db
      .select({ subject: documents.subject })
      .from(documents)
      .where(eq(documents.userId, userId));
    const uniqueSubjects = new Set(userDocuments.map((d) => d.subject.trim().toLowerCase()));

    // Quiz statistics
    const userQuizActivities = await db
      .select()
      .from(userActivities)
      .where(
        and(
          eq(userActivities.userId, userId),
          eq(userActivities.activityType, 'quiz_completed')
        )
      );

    const quizzesAttempted = userQuizActivities.length;
    let avgQuizAccuracy = 0;
    if (quizzesAttempted > 0) {
      const totalScore = userQuizActivities.reduce((acc, curr) => acc + (curr.score || 0), 0);
      const totalQuestions = userQuizActivities.reduce(
        (acc, curr) => acc + (curr.totalQuestions || 1),
        0
      );
      avgQuizAccuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    }

    // Flashcard statistics
    const [flashcardDecksCountResult] = await db
      .select({ count: sql`count(*)` })
      .from(flashcards)
      .where(eq(flashcards.userId, userId));

    // Get mastered cards count (where card box level is 5)
    let cardsMastered = 0;
    let cardsReviewed = 0;
    const userDecks = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId));

    userDecks.forEach((deck) => {
      try {
        const parsed = JSON.parse(deck.cards);
        if (Array.isArray(parsed)) {
          cardsMastered += parsed.filter((c) => c.box === 5).length;
          cardsReviewed += parsed.filter((c) => c.lastReviewed !== null).length;
        }
      } catch (e) {
        console.error('Error parsing flashcards:', e.message);
      }
    });

    res.status(200).json({
      userName: req.user.name,
      collegeName: req.user.college,
      xp: stats.xp,
      level: stats.level,
      streak: stats.streak,
      longestStreak: stats.longestStreak,
      studyTime: stats.studyTime, // seconds
      documentsCount: parseInt(docsCountResult.count, 10) || 0,
      subjectsCount: uniqueSubjects.size,
      quizzesAttempted,
      avgQuizAccuracy,
      flashcardDecksCount: parseInt(flashcardDecksCountResult.count, 10) || 0,
      cardsReviewed,
      cardsMastered,
      goals: {
        daily: { target: stats.dailyGoalXp, current: Math.min(stats.xp, stats.dailyGoalXp) },
        weekly: { target: stats.weeklyGoalXp, current: Math.min(stats.xp, stats.weeklyGoalXp) },
        monthly: { target: stats.monthlyGoalXp, current: Math.min(stats.xp, stats.monthlyGoalXp) },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error.message);
    res.status(500).json({ error: 'Server error retrieving summary stats' });
  }
};

/**
 * @desc    Get interactive graph analytics (Weekly Progress, Heatmap, Radar Charts)
 * @route   GET /api/dashboard/analytics
 * @access  Private
 */
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Learning Heatmap (last 365 days contribution matrix)
    const heatmapQuery = await db
      .select({
        date: sql`DATE(created_at)`,
        count: sql`count(*)`,
      })
      .from(userActivities)
      .where(
        and(
          eq(userActivities.userId, userId),
          sql`created_at >= NOW() - INTERVAL '365 days'`
        )
      )
      .groupBy(sql`DATE(created_at)`);

    const heatmapData = heatmapQuery.map((h) => ({
      date: h.date,
      count: parseInt(h.count || '0', 10),
    }));

    // 2. Weekly Study Duration (last 7 days)
    const weeklyQuery = await db
      .select({
        dayName: sql`TO_CHAR(created_at, 'Dy')`,
        duration: sql`sum(duration)`,
        date: sql`DATE(created_at)`,
      })
      .from(userActivities)
      .where(
        and(
          eq(userActivities.userId, userId),
          sql`created_at >= NOW() - INTERVAL '7 days'`
        )
      )
      .groupBy(sql`TO_CHAR(created_at, 'Dy'), DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    const weeklyData = weeklyQuery.map((w) => ({
      day: w.dayName,
      minutes: Math.round((parseInt(w.duration || '0', 10) / 60) * 10) / 10,
    }));

    // 3. Quiz Accuracy Progression Trend Line (last 10 quizzes)
    const accuracyTrend = await db
      .select({
        id: userActivities.id,
        score: userActivities.score,
        total: userActivities.totalQuestions,
        createdAt: userActivities.createdAt,
      })
      .from(userActivities)
      .where(
        and(
          eq(userActivities.userId, userId),
          eq(userActivities.activityType, 'quiz_completed')
        )
      )
      .orderBy(desc(userActivities.createdAt))
      .limit(10);

    const quizTrendData = accuracyTrend
      .reverse()
      .map((item, idx) => ({
        index: idx + 1,
        accuracy: item.total > 0 ? Math.round((item.score / item.total) * 100) : 0,
        date: new Date(item.createdAt).toLocaleDateString(),
      }));

    // 4. Subject Breakdowns (Radar chart scores / counts)
    const userDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const subjectAnalyticsMap = {};
    
    // Fetch all quiz logs containing documents to map them to subject name
    const quizLogs = await db
      .select({
        activity: userActivities,
        subject: documents.subject,
      })
      .from(userActivities)
      .innerJoin(documents, eq(userActivities.documentId, documents.id))
      .where(
        and(
          eq(userActivities.userId, userId),
          eq(userActivities.activityType, 'quiz_completed')
        )
      );

    quizLogs.forEach((log) => {
      const sub = log.subject;
      if (!subjectAnalyticsMap[sub]) {
        subjectAnalyticsMap[sub] = { score: 0, totalQuestions: 0, count: 0 };
      }
      subjectAnalyticsMap[sub].score += log.activity.score || 0;
      subjectAnalyticsMap[sub].totalQuestions += log.activity.totalQuestions || 0;
      subjectAnalyticsMap[sub].count += 1;
    });

    const subjectPerformance = Object.keys(subjectAnalyticsMap).map((subjectName) => {
      const item = subjectAnalyticsMap[subjectName];
      return {
        subject: subjectName,
        accuracy: item.totalQuestions > 0 ? Math.round((item.score / item.totalQuestions) * 100) : 0,
        quizzesTaken: item.count,
      };
    });

    // 5. Flashcards Spaced Repetition Box Distribution
    const boxCounts = [0, 0, 0, 0, 0];
    const decks = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId));

    decks.forEach((deck) => {
      try {
        const parsed = JSON.parse(deck.cards);
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => {
            const idx = Math.min(Math.max(c.box - 1, 0), 4);
            boxCounts[idx]++;
          });
        }
      } catch (e) {}
    });

    const retentionDistribution = boxCounts.map((count, idx) => ({
      box: `Box ${idx + 1}`,
      count,
    }));

    res.status(200).json({
      heatmap: heatmapData,
      weeklyStudyTime: weeklyData,
      quizTrend: quizTrendData,
      subjectPerformance,
      retentionDistribution,
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error.message);
    res.status(500).json({ error: 'Server error retrieving analytics statistics' });
  }
};

/**
 * @desc    Get competitive leaderboard ranks and user achievements details
 * @route   GET /api/dashboard/social
 * @access  Private
 */
export const getSocial = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Achievements tracking (combine definitions with unlocked states)
    const unlockedRecords = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlockedSet = new Set(unlockedRecords.map((a) => a.achievementId));

    const achievements = ACHIEVEMENTS_LIST.map((ach) => {
      const unlockRecord = unlockedRecords.find((r) => r.achievementId === ach.id);
      return {
        ...ach,
        unlocked: unlockedSet.has(ach.id),
        unlockedAt: unlockRecord ? unlockRecord.unlockedAt : null,
      };
    });

    // 2. Fetch Leaderboard ranks
    // Get actual user stats
    const userStatsRecord = await getOrCreateUserStats(userId);

    // Seed dummy users to construct competitive ranks
    const competitors = [
      { id: 'mock_1', name: 'Dexter Code', college: 'KIET Ghaziabad', level: 12, xp: 4500, isCurrentUser: false },
      { id: 'mock_2', name: 'Aditi Verma', college: 'VIT Vellore', level: 8, xp: 2300, isCurrentUser: false },
      { id: 'mock_3', name: 'Rohit Sharma', college: 'IIT Bombay', level: 6, xp: 1450, isCurrentUser: false },
      { id: 'mock_4', name: 'Nisha Gupta', college: 'BITS Pilani', level: 3, xp: 520, isCurrentUser: false },
      {
        id: userId,
        name: req.user.name,
        college: req.user.college || 'Study Space',
        level: userStatsRecord.level,
        xp: userStatsRecord.xp,
        isCurrentUser: true,
      },
    ];

    // Sort competitors by XP
    competitors.sort((a, b) => b.xp - a.xp);

    const leaderboard = competitors.map((c, index) => ({
      rank: index + 1,
      name: c.name,
      college: c.college,
      level: c.level,
      xp: c.xp,
      isCurrentUser: c.isCurrentUser,
    }));

    res.status(200).json({
      achievements,
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard and achievements:', error.message);
    res.status(500).json({ error: 'Server error retrieving leaderboard analytics' });
  }
};

/**
 * @desc    Get AI-driven study insights and revision recommendations
 * @route   GET /api/dashboard/insights
 * @access  Private
 */
export const getInsights = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get user statistics
    const stats = await getOrCreateUserStats(userId);

    // 2. Fetch user's study documents
    const userDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId));

    const insights = [];

    // Rule-based insights parsing:
    // Insight 1: Streak motivation
    if (stats.streak >= 3) {
      insights.push({
        type: 'motivation',
        text: `🔥 You are on a ${stats.streak}-day study streak! Keep up the momentum to secure your spot on the leaderboard.`,
        suggestedAction: 'Take a quick 5-min Quiz to keep it active.',
      });
    } else {
      insights.push({
        type: 'motivation',
        text: '⚡ Consistency is key. Study today to activate your daily study streak multiplier and gain bonus XP!',
        suggestedAction: 'Review a document to activate streak.',
      });
    }

    // Insight 2: Subjects review triggers
    const quizLogs = await db
      .select({
        score: userActivities.score,
        total: userActivities.totalQuestions,
        subject: documents.subject,
      })
      .from(userActivities)
      .innerJoin(documents, eq(userActivities.documentId, documents.id))
      .where(
        and(
          eq(userActivities.userId, userId),
          eq(userActivities.activityType, 'quiz_completed')
        )
      );

    const lowScoreSubjects = [];
    quizLogs.forEach((log) => {
      const accuracy = log.total > 0 ? (log.score / log.total) * 100 : 0;
      if (accuracy < 60 && !lowScoreSubjects.includes(log.subject)) {
        lowScoreSubjects.push(log.subject);
      }
    });

    if (lowScoreSubjects.length > 0) {
      insights.push({
        type: 'weakness',
        text: `⚠️ Your average quiz score in ${lowScoreSubjects[0]} is below 60%. Conceptual gaps might have appeared.`,
        suggestedAction: `Revise chunk summaries for ${lowScoreSubjects[0]} or start an interactive doubt chat.`,
      });
    }

    // Insight 3: Upcoming flashcard reviews
    let pendingReviews = 0;
    const now = new Date();
    const decks = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId));

    decks.forEach((deck) => {
      try {
        const parsed = JSON.parse(deck.cards);
        if (Array.isArray(parsed)) {
          const due = parsed.filter((c) => !c.nextReviewDate || new Date(c.nextReviewDate) <= now);
          pendingReviews += due.length;
        }
      } catch (e) {}
    });

    if (pendingReviews > 0) {
      insights.push({
        type: 'revision',
        text: `🧠 Spaced-repetition trigger: You have ${pendingReviews} flashcards due for revision today to maximize memory retention.`,
        suggestedAction: 'Review pending flashcards from your subjects.',
      });
    } else {
      insights.push({
        type: 'revision',
        text: '✅ All study cards are optimized! No memory reviews are currently due. Your long-term retention curve is stable.',
        suggestedAction: 'Create a new quiz or upload study materials to generate cards.',
      });
    }

    // Insight 4: Best study hours timing
    const activeTimes = await db
      .select({
        hour: sql`EXTRACT(HOUR FROM created_at)`,
      })
      .from(userActivities)
      .where(eq(userActivities.userId, userId));

    if (activeTimes.length > 3) {
      const hourCounts = {};
      activeTimes.forEach((at) => {
        const hr = parseInt(at.hour, 10);
        hourCounts[hr] = (hourCounts[hr] || 0) + 1;
      });

      const peakHour = Object.keys(hourCounts).reduce((a, b) =>
        hourCounts[a] > hourCounts[b] ? a : b
      );
      const hrNum = parseInt(peakHour, 10);
      const ampm = hrNum >= 12 ? 'PM' : 'AM';
      const prettyHour = hrNum % 12 === 0 ? 12 : hrNum % 12;

      insights.push({
        type: 'time',
        text: `📈 Peak Focus: You usually complete most of your active study tasks around ${prettyHour} ${ampm}.`,
        suggestedAction: 'Schedule your core concept readings around this time.',
      });
    }

    res.status(200).json({ insights });
  } catch (error) {
    console.error('Error generating AI insights:', error.message);
    res.status(500).json({ error: 'Server error generating recommendations' });
  }
};

/**
 * @desc    Get recent activity logs
 * @route   GET /api/dashboard/activity/recent
 * @access  Private
 */
export const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;

    const activities = await db
      .select({
        id: userActivities.id,
        activityType: userActivities.activityType,
        score: userActivities.score,
        totalQuestions: userActivities.totalQuestions,
        xpEarned: userActivities.xpEarned,
        createdAt: userActivities.createdAt,
        docTitle: documents.title,
        subject: documents.subject,
      })
      .from(userActivities)
      .leftJoin(documents, eq(userActivities.documentId, documents.id))
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .limit(10);

    res.status(200).json({ activities });
  } catch (error) {
    console.error('Error fetching recent activities:', error.message);
    res.status(500).json({ error: 'Server error retrieving recent activity log' });
  }
};
