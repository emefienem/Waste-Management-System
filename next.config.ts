import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    WEB3_AUTH_CLIENT_ID: process.env.WEB3_AUTH_CLIENT_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    POSTMARK_API_KEY: process.env.POSTMARK_API_KEY,
  },
  /* config options here */
  productionBrowserSourceMaps: true,
};

export default nextConfig;
