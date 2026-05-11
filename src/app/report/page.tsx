"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Upload, CheckCircle, Loader } from "lucide-react";
import {
  StandaloneSearchBox,
  useJsApiLoader,
  Libraries,
} from "@react-google-maps/api";
import toast from "react-hot-toast";
import {
  createReport,
  getRecentReports,
  getUserByEmail,
} from "@/utils/db/actions";
import { Button } from "@/components/ui/button";
import { parseGeminiJson } from "@/lib/helper";

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

const libraries: Libraries = ["places"];

interface User {
  id: number;
  email: string;
  name: string;
}

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null);
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
    googleMapsApiKey,
    libraries,
  });

  const onLoad = useCallback(
    (ref: google.maps.places.SearchBox) => setSearchBox(ref),
    [],
  );

  const onPlaceChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places?.length) {
        const place = places[0];
        setNewReport((prev) => ({
          ...prev,
          location: place.formatted_address || "",
        }));
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewReport((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  // const readFileAsBase64 = (file: File): Promise<string> =>
  //   new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = () => resolve(reader.result as string);
  //     reader.onerror = reject;
  //     reader.readAsDataURL(file);
  //   });

  const handleVerify = async () => {
    if (!file) return;

    setVerificationStatus("verifying");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Verification failed");

      const data = await res.json();

      const parsed = parseGeminiJson(data.result);

      if (!parsed) throw new Error("Invalid AI response format.");

      if (parsed.wasteType && parsed.quantity && parsed.confidence) {
        setVerificationResult(parsed);
        setVerificationStatus("success");
        setNewReport({
          ...newReport,
          type: parsed.wasteType,
          amount: parsed.quantity,
        });
      } else throw new Error("Invalid response");
    } catch (err) {
      console.error(err);
      setVerificationStatus("failure");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || verificationStatus !== "success")
      return toast.error("Please verify and login first");
    setIsSubmitting(true);
    try {
      const created = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        // verificationResult ? JSON.stringify(verificationResult) : undefined
        verificationResult ?? undefined,
      );
      setReports([
        {
          id: created?.id ?? Date.now(),
          location: created?.location ?? "",
          wasteType: created?.wasteType ?? "",
          amount: created?.amount ?? "",
          createdAt: created?.createdAt.toISOString().split("T")[0] ?? "",
        },
        ...reports,
      ]);
      setNewReport({ location: "", type: "", amount: "" });
      setFile(null);
      setPreview(null);
      setVerificationResult(null);
      setVerificationStatus("idle");
      toast.success("Report submitted!");
    } catch {
      toast.error("Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    (async () => {
      const email = localStorage.getItem("userEmail");
      if (email) {
        const user = await getUserByEmail(email);
        const recent = await getRecentReports();
        const formatted = recent?.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString().split("T")[0],
        }));
        setUser(user);
        setReports(formatted);
      } else {
        window.location.href = "/";
        toast.error("Please login");
      }
    })();
  }, []);

  return (
    <div className="w-full max-w-[80vw] px-4 py-6 sm:px-6 md:px-8 mx-auto text-gray-800 overflow-x-hidden">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-6 text-gray-800">
        Report Waste
      </h1>

      <form
        onSubmit={handleSubmit}
        className="w-full bg-white p-4 sm:p-6 rounded-2xl shadow-lg mb-12"
      >
        <div className="mb-6">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Upload Waste Image
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <label className="text-green-600 cursor-pointer block">
              Upload a file
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
            <p className="text-xs text-gray-500">PNG, JPG, or GIF (max 10MB)</p>
          </div>
        </div>

        {preview && (
          <div className="mb-6">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-w-sm mx-auto rounded-xl shadow-md"
            />
          </div>
        )}

        <Button
          type="button"
          onClick={handleVerify}
          className="w-full mb-6 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl"
          disabled={!file || verificationStatus === "verifying"}
        >
          {verificationStatus === "verifying" ? (
            <>
              <Loader className="animate-spin mr-2 h-5 w-5" />
              Verifying...
            </>
          ) : (
            "Verify Waste"
          )}
        </Button>

        {verificationStatus === "success" && verificationResult && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-xl text-sm">
            <CheckCircle className="inline w-5 h-5 text-green-600 mr-2" />
            <strong>Type:</strong> {verificationResult.wasteType} |{" "}
            <strong>Qty:</strong> {verificationResult.quantity} |{" "}
            <strong>Confidence:</strong>{" "}
            {(verificationResult.confidence * 100).toFixed(1)}%
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1 font-medium">Location</label>
            {isLoaded ? (
              <StandaloneSearchBox
                onLoad={onLoad}
                onPlacesChanged={onPlaceChanged}
              >
                <input
                  type="text"
                  name="location"
                  value={newReport.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                />
              </StandaloneSearchBox>
            ) : (
              <input
                type="text"
                name="location"
                value={newReport.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl"
              />
            )}
          </div>
          <input
            type="text"
            name="type"
            readOnly
            placeholder="Waste Type"
            value={newReport.type}
            className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-xl"
          />
          <input
            type="text"
            name="amount"
            readOnly
            placeholder="Estimated Amount"
            value={newReport.amount}
            className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-xl"
          />
        </div>

        <Button
          type="submit"
          className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin mr-2 h-5 w-5" />
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </form>

      <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
        Recent Reports
      </h2>
      <div className="overflow-x-auto rounded-xl shadow-md">
        <table className="min-w-[600px] w-full text-sm table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Location
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-normal break-words">
                  <MapPin className="inline w-4 h-4 text-green-500 mr-1" />
                  {r.location}
                </td>
                <td className="px-4 py-2 whitespace-normal break-words">
                  {r.wasteType}
                </td>
                <td className="px-4 py-2">{r.amount}</td>
                <td className="px-4 py-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
