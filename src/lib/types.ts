export type RewardO = {
  id: number;
  name: string;
  cost: number;
  description: string | null;
  collectionInfo: string;
};

export type Reward = {
  id: number;
  userId: number;
  name: string;
  collectionInfo: string;
  points: number;
  level: number;
  isAvailable: boolean;
  updatedAt: Date;
};

export interface Report2 {
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

export interface Report3 {
  id: number;
  location: string;
  wasteType: string;
  amount: string;
  createdAt: Date;
}

export type WasteCollectionTask = {
  id: number;
  location: string;
  wasteType: string;
  amount: string;
  status: string;
  date: Date | string;
  collectorId: number | null;
};

export type UpdateData = {
  status: string;
  collectorId?: number;
};

export type Timeframe = "week" | "month" | "year";

export interface WasteDistributionItem {
  category: string;
  count: number;
  totalAmount: number;
}

export interface ProcessingOutcomes {
  recycled: number;
  recovered: number;
  composted: number;
  disposed: number;
  total: number;
}

export interface WasteAnalyticsResult {
  wasteDistribution: WasteDistributionItem[];
  processingOutcomes: ProcessingOutcomes;
  recoveryRate: number;
  totalReports: number;
  timeframe: Timeframe;
  dateFilter: string | Date;
}

export type ExtractedComponents = {
  metals: string;
  plastics: string;
  circuit_boards: string;
};
