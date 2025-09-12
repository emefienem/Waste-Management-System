"use client";
import { useState, useEffect } from "react";
import { Recycle, Trash2, Leaf, Cpu, Book, Archive } from "lucide-react";
import { db } from "@/utils/db/dbConfig";
import { WasteCategories, Reports } from "@/utils/db/schema";
import { eq, sql, count } from "drizzle-orm";

interface BinData {
  id: number;
  name: string;
  count: number;
  icon: JSX.Element;
  color: string;
}

export default function VirtualBinsDashboard() {
  const [bins, setBins] = useState<BinData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBinData();
  }, []);

  const loadBinData = async () => {
    try {
      // Get all waste categories
      const categories = await db.select().from(WasteCategories).execute();

      // Get count of reports for each category
      const binData = await Promise.all(
        categories.map(async (category) => {
          const reportCount = await db
            .select({ count: count() })
            .from(Reports)
            .where(eq(Reports.categoryId, category.id))
            .execute();

          return {
            id: category.id,
            name: category.binName,
            count: reportCount[0]?.count || 0,
            icon: getBinIcon(category.binName),
            color: getBinColor(category.binName),
          };
        })
      );

      setBins(binData);
    } catch (error) {
      console.error("Error loading bin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBinIcon = (binName: string) => {
    switch (binName) {
      case "Organic Bin":
        return <Leaf className="h-8 w-8" />;
      case "Plastic Bin":
        return <Recycle className="h-8 w-8" />;
      case "E-waste Bin":
        return <Cpu className="h-8 w-8" />;
      case "Paper/Glass Bin":
        return <Book className="h-8 w-8" />;
      case "Mixed Waste Bin":
        return <Archive className="h-8 w-8" />;
      default:
        return <Trash2 className="h-8 w-8" />;
    }
  };

  const getBinColor = (binName: string) => {
    switch (binName) {
      case "Organic Bin":
        return "bg-green-100 text-green-800";
      case "Plastic Bin":
        return "bg-blue-100 text-blue-800";
      case "E-waste Bin":
        return "bg-purple-100 text-purple-800";
      case "Paper/Glass Bin":
        return "bg-yellow-100 text-yellow-800";
      case "Mixed Waste Bin":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="p-6">Loading bin data...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Virtual Waste Bins</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bins.map((bin) => (
          <div
            key={bin.id}
            className={`p-6 rounded-lg shadow-md flex items-center justify-between ${bin.color}`}
          >
            <div className="flex items-center">
              <div className="mr-4">{bin.icon}</div>
              <div>
                <h3 className="font-semibold">{bin.name}</h3>
                <p className="text-2xl mt-1">{bin.count} items</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
