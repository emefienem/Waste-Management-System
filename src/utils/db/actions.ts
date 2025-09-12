import { getDateFilter } from "@/lib/helper";
import { categorizeWaste } from "../wasteCategorization";
import { db } from "./dbConfig";

import {
  CollectedWastes,
  Notifications,
  Reports,
  Rewards,
  Transactions,
  Users,
  WasteCategories,
} from "./schema";

import { eq, sql, and, desc } from "drizzle-orm";
import {
  ExtractedComponents,
  Report2,
  Report3,
  Reward,
  RewardO,
  Timeframe,
  UpdateData,
  WasteAnalyticsResult,
  WasteCollectionTask,
} from "@/lib/types";

export async function createUser(email: string, name: string) {
  try {
    const [user] = await db
      .insert(Users)
      .values({ email, name })
      .returning()
      .execute();
    return user;
  } catch (error) {
    console.log("Error creating user", error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.email, email))
      .execute();
    return user;
  } catch (error) {
    console.error("Error fetching user by email", error);
    return null;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db
      .select()
      .from(Notifications)
      .where(
        and(eq(Notifications.userId, userId), eq(Notifications.isRead, false))
      )
      .execute();
  } catch (error) {
    console.error("Error fetching unread notifications", error);
    return null;
  }
}

export async function getUserBalance(userId: number): Promise<number> {
  const transactions = (await getRewardTransactions(userId)) || [];

  if (!transactions) return 0;
  const balance = transactions.reduce(
    (acc: number, transaction: { amount: number; type: string }) => {
      return transaction.type.startsWith("earned")
        ? acc + transaction.amount
        : acc - transaction.amount;
    },
    0
  );
  return Math.max(balance, 0);
}

export async function getRewardTransactions(userId: number) {
  try {
    const transactions = await db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    const formattedTransactions = transactions.map((t) => ({
      ...t,
      date: t.date.toISOString().split("T")[0], /// YYY-MM-DD
    }));
    return formattedTransactions;
  } catch (error) {
    console.error("Error fetching rewards transactions", error);
    return null;
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db
      .update(Notifications)
      .set({ isRead: true })
      .where(eq(Notifications.id, notificationId))
      .execute();
  } catch (error) {
    console.error("Error marking notifications as read", error);
    return null;
  }
}

// interface Report3 {
//   id: number;
//   location: string;
//   wasteType: string;
//   amount: string;
//   createdAt: Date;
// }

// Update the createReport function
export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  verificationResult?: {
    wasteType: string;
    quantity: string;
    confidence: number;
  }
): Promise<Report3 | null> {
  try {
    // Categorize the waste
    const categoryId = categorizeWaste(wasteType);

    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
        verificationResult,
        categoryId,
        status: "pending",
      })
      .returning()
      .execute();

    // Rest of the function remains the same
    const pointsEarned = 10;
    await updateRewardPoints(userId, pointsEarned);
    await createTransaction(
      userId,
      "earned_report",
      pointsEarned,
      "Points earned for reporting waste"
    );
    await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste!`,
      "reward"
    );

    return report;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

export async function updateRewardPoints(userId: number, pointsToAdd: number) {
  try {
    const [updatedRewards] = await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${pointsToAdd}`,
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();
    return updatedRewards;
  } catch (error) {
    console.error("Error updating rewards points", error);
    return null;
  }
}

export async function createTransaction(
  userId: number,
  type: "earned_report" | "earned_collect" | "redeemed",
  amount: number,
  description: string
) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({ userId, type, amount, description })
      .returning()
      .execute();
    return transaction;
  } catch (error) {
    console.error("Error creating transactions", error);
    return null;
  }
}

export async function createNotification(
  userId: number,
  message: string,
  type: string
) {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({ userId, message, type })
      .returning()
      .execute();
    return notification;
  } catch (error) {
    console.error("Error creating notifications", error);
  }
}

export async function getRecentReports(limit: number = 10): Promise<Report2[]> {
  try {
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();

    return reports;
  } catch (error) {
    console.error("Error fetching recent report", error);
    return [];
  }
}

// type AvailableReward = RewardO[];

export async function getAvailableRewards(userId: number): Promise<RewardO[]> {
  try {
    const userTransactions = await getRewardTransactions(userId);
    const userPoints = userTransactions?.reduce(
      (total: number, transaction: { type: string; amount: number }) => {
        return transaction.type.startsWith("earned")
          ? total + transaction.amount
          : total - transaction.amount;
      },
      0
    );

    const dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    console.log("Rewards from database:", dbRewards);

    // combines user points and database rewards
    const allRewards: RewardO[] = [
      {
        id: 0,
        name: "Your Points",
        cost: userPoints ?? 0,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste",
      },
      ...dbRewards,
    ];

    console.log("All available rewards:", allRewards);
    return allRewards;
  } catch (error) {
    console.error("Error fetching available rewards", error);
    return [];
  }
}

export async function getWasteCollectionTask(
  limit: number = 20
): Promise<WasteCollectionTask[]> {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return tasks.map(
      (task): WasteCollectionTask => ({
        ...task,
        date: task.date.toISOString().split("T")[0],
      })
    );
  } catch (error) {
    console.error("Error fetching waste collection task", error);
    return [];
  }
}

export async function updateTaskStatus(
  reportId: number,
  newStatus: string,
  collectorId: number
) {
  try {
    const updateData: UpdateData = { status: newStatus };
    if (collectorId !== undefined) {
      updateData.collectorId = collectorId;
    }

    const [updateReport] = await db
      .update(Reports)
      .set(updateData)
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();

    return updateReport;
  } catch (error) {
    console.error("Error updating task status", error);
  }
}

export async function saveReward(userId: number, amount: number) {
  try {
    const [reward] = await db
      .insert(Rewards)
      .values({
        userId,
        name: "Waste Collection Reward",
        collectionInfo: "Points earned from waste collection",
        points: amount,
        isAvailable: true,
      })
      .returning()
      .execute();

    await createTransaction(
      userId,
      "earned_collect",
      amount,
      "Points earned for collecting waste"
    );

    return reward;
  } catch (error) {
    console.error("Error saving rewards", error);
    throw error;
  }
}

// export async function saveCollectedWaste(
//   reportId: number,
//   collectorId: number,
//   amount: string | number,
//   verificationResult?: {
//     wasteType: string;
//     quantity: string;
//     confidence: number;
//   }
// ) {
//   try {
//     const [collectedWaste] = await db
//       .insert(CollectedWastes)
//       .values({
//         reportId,
//         collectorId,
//         collectionDate: new Date(),
//         status: "collected", //s
//         amount:
//           typeof amount === "string"
//             ? amount.replace(/[^\d.]/g, "") // already string
//             : String(amount),
//         verificationResult,
//       })
//       .returning()
//       .execute();

//     return collectedWaste;
//   } catch (error) {
//     console.error("Error saving collected waste:", error);
//     throw error;
//   }
// }

export async function processCollectedWaste(
  reportId: number,
  collectorId: number,
  amount: string | number,
  verificationResult?: {
    wasteType: string;
    quantity: string;
    confidence: number;
  }
) {
  try {
    const [report] = await db
      .select({
        id: Reports.id,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        categoryId: Reports.categoryId,
        category: WasteCategories,
      })
      .from(Reports)
      .leftJoin(WasteCategories, eq(Reports.categoryId, WasteCategories.id))
      .where(eq(Reports.id, reportId))
      .execute();

    if (!report) throw new Error("Report not found");

    const processingDetails: {
      processingMethod: string;
      recoveryRate: number | null;
      fertilizerAmount: string | null;
      componentsExtracted: ExtractedComponents | null;
    } = {
      processingMethod: "",
      recoveryRate: null,
      fertilizerAmount: null,
      componentsExtracted: null,
    };

    switch (report.categoryId) {
      case 1: // Organic
        processingDetails.processingMethod = "Composted";
        // Estimate fertilizer: ~1kg per 5kg organic waste
        const amountNum = parseFloat(report.amount) || 0;
        processingDetails.fertilizerAmount = `${(amountNum / 5).toFixed(
          1
        )}kg fertilizer`;
        break;

      case 2: // Plastic
      case 4: // Paper
      case 5: // Glass
        processingDetails.processingMethod = "Recycled";
        processingDetails.recoveryRate = report.category
          ? report.category.recoveryRate
          : null;
        break;

      case 3: // E-waste
        processingDetails.processingMethod = "Recovered";
        processingDetails.recoveryRate = report.category
          ? report.category.recoveryRate
          : null;
        processingDetails.componentsExtracted = {
          metals: "Copper, Gold, Silver",
          plastics: "Various plastic components",
          circuit_boards: "Extracted and processed",
        };
        break;

      case 6: // Mixed waste
      default:
        processingDetails.processingMethod = "Disposed (Landfill)";
        break;
    }

    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: "processed",
        verificationResult,
        amount:
          typeof amount === "string"
            ? amount.replace(/[^\d.]/g, "") // already string
            : String(amount),
        ...processingDetails,
      })
      .returning()
      .execute();

    // Update report status
    await db
      .update(Reports)
      .set({ status: "processed" })
      .where(eq(Reports.id, reportId))
      .execute();

    return collectedWaste;
  } catch (error) {
    console.error("Error processing waste:", error);
    throw error;
  }
}

export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = (await getOrCreateReward(userId)) as Reward;

    if (rewardId === 0) {
      // redeem all points
      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        userReward.points,
        `Redeemed all points: ${userReward.points}`
      );

      return updatedReward;
    } else {
      // existing logic for redeeming specific rewards
      const availableReward = await db
        .select()
        .from(Rewards)
        .where(eq(Rewards.id, rewardId))
        .execute();

      if (
        !userReward ||
        !availableReward[0] ||
        userReward.points < availableReward[0].points
      ) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        availableReward[0].points,
        `Redeemed: ${availableReward[0].name}`
      );

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.userId, userId))
      .execute();
    if (!reward) {
      [reward] = await db
        .insert(Rewards)
        .values({
          userId,
          name: "Default Reward",
          collectionInfo: "Default Collection Info",
          points: 0,
          level: 1,
          isAvailable: true,
        })
        .returning()
        .execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}

export async function getWasteAnalytics(
  timeframe: Timeframe
): Promise<WasteAnalyticsResult> {
  try {
    console.log("Getting analytics for timeframe:", timeframe);
    const dateFilter = getDateFilter(timeframe);
    console.log("Date filter:", dateFilter);

    // Get waste distribution by category with better error handling
    const wasteDistribution = await db
      .select({
        category: WasteCategories.name,
        count: sql<number>`count(${Reports.id})`,
        totalAmount: sql<number>`COALESCE(sum(CASE 
          WHEN ${Reports.amount} ~ '^[0-9]+\.?[0-9]*$' 
          THEN cast(${Reports.amount} as numeric) 
          ELSE 0 
        END), 0)`,
      })
      .from(Reports)
      .leftJoin(WasteCategories, eq(Reports.categoryId, WasteCategories.id))
      .where(sql`${Reports.createdAt} >= ${dateFilter}`)
      .groupBy(WasteCategories.name)
      .execute();

    console.log("Waste distribution raw data:", wasteDistribution);

    // Get processing outcomes with better error handling
    const processingOutcomes = await db
      .select({
        method: CollectedWastes.processingMethod,
        count: sql<number>`count(${CollectedWastes.id})`,
      })
      .from(CollectedWastes)
      .where(sql`${CollectedWastes.collectionDate} >= ${dateFilter}`)
      .groupBy(CollectedWastes.processingMethod)
      .execute();

    console.log("Processing outcomes raw data:", processingOutcomes);

    // If no processed waste, check if there are any reports at all
    const totalReports = await db
      .select({
        count: sql<number>`count(${Reports.id})`,
      })
      .from(Reports)
      .where(sql`${Reports.createdAt} >= ${dateFilter}`)
      .execute();

    console.log("Total reports in timeframe:", totalReports);

    // Calculate processing outcomes with defaults
    const totalRecycled = processingOutcomes
      .filter((p) => p.method === "Recycled")
      .reduce((sum, item) => sum + Number(item.count || 0), 0);

    const totalRecovered = processingOutcomes
      .filter((p) => p.method === "Recovered")
      .reduce((sum, item) => sum + Number(item.count || 0), 0);

    const totalComposted = processingOutcomes
      .filter((p) => p.method === "Composted")
      .reduce((sum, item) => sum + Number(item.count || 0), 0);

    const totalDisposed = processingOutcomes
      .filter((p) => p.method === "Disposed (Landfill)")
      .reduce((sum, item) => sum + Number(item.count || 0), 0);

    const totalProcessed =
      totalRecycled + totalRecovered + totalComposted + totalDisposed;

    // Clean up waste distribution data
    const cleanWasteDistribution = wasteDistribution
      .filter((item) => item.category !== null && Number(item.count || 0) > 0)
      .map((item) => ({
        category: item.category || "Unknown",
        count: Number(item.count || 0),
        totalAmount: Number(item.totalAmount || 0),
      }));

    // If no processed data but there are reports, create mock processing data
    const processingOutcomesData = {
      recycled: totalRecycled,
      recovered: totalRecovered,
      composted: totalComposted,
      disposed: totalDisposed,
      total: totalProcessed,
    };

    // If no processing data but there are reports, show the reports as pending
    if (totalProcessed === 0 && totalReports[0]?.count > 0) {
      processingOutcomesData.total = Number(totalReports[0].count);
      // You could add a "pending" category here if needed
    }

    const result = {
      wasteDistribution: cleanWasteDistribution,
      processingOutcomes: processingOutcomesData,
      recoveryRate:
        totalProcessed > 0
          ? ((totalRecycled + totalRecovered + totalComposted) /
              totalProcessed) *
            100
          : 0,
      totalReports: Number(totalReports[0]?.count || 0),
      timeframe,
      dateFilter,
    };

    console.log("Final analytics result:", result);
    return result;
  } catch (error) {
    console.error("Error in getWasteAnalytics:", error);
    throw new Error(
      `Failed to fetch waste analytics: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function getImpactStats(userId?: number) {
  const [result] = await db
    .select({
      wasteCollected: sql<number>`COALESCE(SUM(CAST(${CollectedWastes.amount} AS NUMERIC)), 0)`,
      reportsSubmitted: sql<number>`COUNT(${Reports.id})`,
    })
    .from(CollectedWastes)
    .leftJoin(Reports, eq(CollectedWastes.reportId, Reports.id))
    .where(userId ? eq(CollectedWastes.collectorId, userId) : undefined)
    .execute();

  const rewards = await getAllRewards();
  const tokensEarned = rewards.reduce(
    (total, reward) => total + (reward.points || 0),
    0
  );
  const co2Offset = (Number(result.wasteCollected) || 0) * 0.5;

  return {
    wasteCollected: Number(result.wasteCollected) || 0,
    reportsSubmitted: Number(result.reportsSubmitted) || 0,
    tokensEarned,
    co2Offset,
  };
}
