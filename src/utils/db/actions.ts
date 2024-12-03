import { db } from "./dbConfig";

import {
  CollectedWastes,
  Notifications,
  Reports,
  Rewards,
  Transactions,
  Users,
} from "./schema";

import { eq, sql, and, desc } from "drizzle-orm";

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

interface Report3 {
  id: number;
  location: string;
  wasteType: string;
  amount: string;
  createdAt: Date;
}
export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  type?: string,
  verificationResult?: {
    wasteType: string;
    quantity: string;
    confidence: number;
  }
): Promise<Report3 | null> {
  try {
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
        verificationResult,
        status: "pending",
      })
      .returning()
      .execute();

    const pointsEarned = 10;
    // update reward points
    await updateRewardPoints(userId, pointsEarned);

    // create transaction
    await createTransaction(
      userId,
      "earned_report",
      pointsEarned,
      "Points earned for reporting waste"
    );

    // create notification
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

interface Report2 {
  id: number;
  createdAt: Date; // assuming createdAt is a Date object
  userId: number;
  location: string;
  wasteType: string;
  amount: string;
  imageUrl: string | null;
  verificationResult?: unknown;
  status: string;
  collectorId: number | null;
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

type RewardO = {
  id: number;
  name: string;
  cost: number;
  description: string | null;
  collectionInfo: string;
};

type AvailableReward = RewardO[];

export async function getAvailableRewards(
  userId: number
): Promise<AvailableReward> {
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

    // Combine user points and database rewards
    const allRewards: AvailableReward = [
      {
        id: 0, // Use a special ID for user's points
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

type WasteCollectionTask = {
  id: number;
  location: string;
  wasteType: string;
  amount: string;
  status: string;
  date: Date | string;
  collectorId: number | null; // Nullable if collectorId might be missing
};

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

type UpdateData = {
  status: string;
  collectorId?: number;
};

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

export async function saveCollectedWaste(
  reportId: number,
  collectorId: number,
  verificationResult?: {
    wasteType: string;
    quantity: string;
    confidence: number;
  }
) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: "verified",
        verificationResult,
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error saving collected waste:", error);
    throw error;
  }
}

type Reward = {
  id: number;
  userId: number;
  name: string;
  collectionInfo: string;
  points: number;
  level: number;
  isAvailable: boolean;
  updatedAt: Date;
};

export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = (await getOrCreateReward(userId)) as Reward;

    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        userReward.points,
        `Redeemed all points: ${userReward.points}`
      );

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
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

      // Create a transaction for this redemption
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
