"use client";
import { useState, useEffect } from "react";

import { Inter } from "next/font/google";

import "./globals.css";

// header
//sidebar

import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalEarnings, setTotalOpenings] = useState(0);

  // useEffect(() => {

  // })
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
            <Sidebar open={sidebarOpen} />
            <main className="flex-1 p-4 lg:p-0 ml-0 lg:ml-44 transition-all duration-300">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
