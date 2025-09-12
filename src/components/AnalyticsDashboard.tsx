"use client";
import { useState, useEffect } from "react";
import {
  PieChart,
  BarChart,
  TrendingUp,
  Recycle,
  Trash2,
  Leaf,
} from "lucide-react";
import { getWasteAnalytics } from "@/utils/db/actions";
import { initializeWasteCategories } from "@/utils/db/wasteCategories";

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      await initializeWasteCategories();

      console.log("Fetching analytics for timeframe:", timeframe);
      const analyticsData = await getWasteAnalytics(timeframe);
      console.log("Analytics data received:", analyticsData);

      // Check if we have valid data
      if (
        !analyticsData ||
        ((!analyticsData.wasteDistribution ||
          analyticsData.wasteDistribution.length === 0) &&
          (!analyticsData.processingOutcomes ||
            analyticsData.processingOutcomes.total === 0))
      ) {
        console.log("No analytics data available");
        setData(null);
      } else {
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load analytics"
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading analytics: {error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Trash2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-600 mb-4">
            No waste collection data found for the selected timeframe.
          </p>
          <p className="text-sm text-gray-500">
            Data will appear here once waste reports are submitted and
            processed.
          </p>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Waste Management Analytics</h1>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="p-2 border rounded"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="year">Last Year</option>
        </select>
      </div>

      {/* Processing Outcomes Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Recycle className="text-blue-500 mr-2" />
            <h3 className="font-semibold">Recycled</h3>
          </div>
          <p className="text-2xl mt-2">
            {data.processingOutcomes?.recycled || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="text-green-500 mr-2" />
            <h3 className="font-semibold">Recovered</h3>
          </div>
          <p className="text-2xl mt-2">
            {data.processingOutcomes?.recovered || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Leaf className="text-yellow-500 mr-2" />
            <h3 className="font-semibold">Composted</h3>
          </div>
          <p className="text-2xl mt-2">
            {data.processingOutcomes?.composted || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Trash2 className="text-red-500 mr-2" />
            <h3 className="font-semibold">Disposed</h3>
          </div>
          <p className="text-2xl mt-2">
            {data.processingOutcomes?.disposed || 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waste Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Waste Distribution by Type</h3>
          {data.wasteDistribution && data.wasteDistribution.length > 0 ? (
            <div className="space-y-2">
              {data.wasteDistribution.map((item: any) => (
                <div key={item.category} className="flex justify-between">
                  <span>{item.category || "Unknown"}</span>
                  <span>
                    {item.count || 0} items ({item.totalAmount || 0} units)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No waste distribution data available</p>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Processing Outcomes</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Overall Recovery Rate</span>
              <span>
                {data.recoveryRate ? data.recoveryRate.toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Processed</span>
              <span>{data.processingOutcomes?.total || 0} items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
