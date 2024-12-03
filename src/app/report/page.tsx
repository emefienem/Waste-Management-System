"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Upload, CheckCircle, Loader } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  StandaloneSearchBox,
  useJsApiLoader,
  Libraries,
} from "@react-google-maps/api";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { createReport } from "@/utils/db/actions";

const geminiAPIKey = process.env.GEMINI_API_KEY as any;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY as any;

const libraries: Libraries = ["places"];

export default function ReportPage() {
  const [user, setUser] = useState("") as any;
  const router = useRouter();
  const [reports, setReports] = useState<
    Array<{
      id: number;
      location: string;
      wasteType: string;
      amount: string;
      createdAt: string;
    }>
  >([]);

  const [newReport, setNewReport] = useState({
    location: "",
    type: "",
    amount: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "failure"
  >("idle");

  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchBox, setSearchBox] =
    useState<google.maps.places.SearchBox | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey,
    libraries: libraries,
  });

  const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const onPlaceChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        setNewReport((prev) => ({
          ...prev,
          location: place.formatted_address || "",
        }));
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVerify = async () => {
    if (!file) return;

    setVerificationStatus("verifying");

    try {
      const genAI = new GoogleGenerativeAI(geminiAPIKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: { data: base64Data.split(",")[1], mimeType: file.type },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide 
      1. The type of waste (e.g., plastic, paper, glass, metal, organic)
      2. An estimate of the quantity oe amount (in kg or litres)
      3. Your confidence level in this assessment (as a percentage)

      Respond in JSON format like this:     
      {
        "wasteType": "type of waste,
        "quantity": "estimated quantity with unit",
        "confidence": "confidence level as a number between 0 and 1"
      }
      
      `;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      try {
        const parseResult = JSON.parse(text);
        if (
          parseResult.wasteType &&
          parseResult.quantity &&
          parseResult.confidence
        ) {
          setVerificationResult(parseResult);
          setVerificationStatus("success");
          setNewReport({
            ...newReport,
            type: parseResult.wasteType,
            amount: parseResult.quantity,
          });
        } else {
          console.error("Invalid verification results", parseResult);
          setVerificationStatus("failure");
        }
      } catch (e) {
        console.error("Failed to parse JSON responses", e);
        setVerificationStatus("failure");
      }
    } catch (e) {
      console.error("Error verifiying waste", e);
      setVerificationStatus("failure");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationStatus !== "success" || !user) {
      toast.error("Please verify the waste before submitting or login");
      return;
    }

    setIsSubmitting(true);

    try {
      const report = (await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        verificationResult ? JSON.stringify(verificationResult) : undefined
      )) as any;

      const formattedReport = {
        id: report.id,
        location: report.location,
        wasteType: report.wasteType,
        amount: report.amount,
        createdAt: report.createdAt.toISOString().split("T")[0],
      };

      setReports([formattedReport, ...reports]);
      setNewReport({ location: "", type: "", amount: "" });
      setFile(null);
      setPreview(null);
      setVerificationStatus("idle");
      setVerificationResult(null);

      toast.success(
        `Report submitted successfully! You've earned poinnts for reporting waste`
      );
    } catch (error) {
      console.error("Error submitting report", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div></div>;
}
