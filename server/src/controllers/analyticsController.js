import InterviewSession from '../models/InterviewSession.js';
import mongoose from 'mongoose';

/**
 * Get User Career Growth Analytics
 * Uses MongoDB Aggregation to calculate velocity across multiple sessions.
 */
export const getUserGrowth = async (req, res) => {
  const { userId } = req.params;

  try {
    const analytics = await InterviewSession.aggregate([
      // 1. Filter by User
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },

      // 2. Sort by Date to track chronological growth
      { $sort: { createdAt: 1 } },

      // 3. Group and Calculate Growth Metrics
      {
        $group: {
          _id: "$userId",
          totalSessions: { $sum: 1 },
          technicalTrend: { $push: "$score.technical" },
          communicationTrend: { $push: "$score.communication" },
          overallTrend: { $push: "$score.overall" },
          averageTechnical: { $avg: "$score.technical" },
          averageCommunication: { $avg: "$score.communication" },
          lastSessionDate: { $last: "$createdAt" },
          
          // Identify recurring "Solid Areas" using $unwind + $sortByCount in separate pipelines is better, 
          // but for this overview, we'll collect the latest arrays.
          skillsAcquired: { $addToSet: "$score.solidAreas" }
        }
      },

      // 4. Project Final Growth Vector
      {
        $project: {
          _id: 0,
          totalSessions: 1,
          averages: {
            technical: { $round: ["$averageTechnical", 1] },
            communication: { $round: ["$averageCommunication", 1] }
          },
          trends: {
            technical: "$technicalTrend",
            communication: "$communicationTrend",
            overall: "$overallTrend"
          },
          velocity: {
            // Calculate growth between first and last session (Velocity)
            $subtract: [
              { $arrayElemAt: ["$overallTrend", -1] },
              { $arrayElemAt: ["$overallTrend", 0] }
            ]
          },
          lastSessionDate: 1,
          // Flatten the nested arrays from $addToSet
          topSkills: {
            $reduce: {
              input: "$skillsAcquired",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] }
            }
          }
        }
      }
    ]);

    if (!analytics || analytics.length === 0) {
      return res.status(404).json({ message: "Not enough session data for analytics." });
    }

    res.status(200).json(analytics[0]);
  } catch (error) {
    console.error("[Analytics Error]:", error);
    res.status(500).json({ message: "Error generating growth metrics", error: error.message });
  }
};
