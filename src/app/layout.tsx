"use client";
import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { getAvailableRewards, getUserByEmail } from "@/utils/db/actions";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  type RewardO = {
    id: number;
    name: string;
    cost: number | undefined;
    description: string | null;
    collectionInfo: string;
  };

  type AvailableReward = RewardO[];
  useEffect(() => {
    const fetchTotalEarnings = async () => {
      try {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          const user = await getUserByEmail(userEmail);
          if (user) {
            const availableResult: AvailableReward = await getAvailableRewards(
              user.id
            );
            const userPoints =
              availableResult.find((reward) => reward.id === 0)?.cost || 0; // Extract points if available
            setTotalEarnings(userPoints);
          }
        }
      } catch (error) {
        console.error("Error fetching total earnings", error);
      }
    };

    fetchTotalEarnings();
  }, []);
  // useEffect(() => {
  //   const fetchTotalEarnings = async () => {
  //     try {
  //       const userEmail = localStorage.getItem("userEmail");
  //       if (userEmail) {
  //         const user = await getUserByEmail(userEmail);
  //         if (user) {
  //           const availableResult = (await getAvailableRewards(user.id)) as any;
  //           setTotalEarnings(availableResult);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error fetching total earnings", error);
  //     }
  //   };

  //   fetchTotalEarnings();
  // }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            totalEarnings={totalEarnings}
          />
          <div className="flex flex-1">
            {/* sidebar  */}
            <Sidebar open={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className="flex-1 p-4 lg:p-8 ml-0 lg:ml-64 transition-all duration-300">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
