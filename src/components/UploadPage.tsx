import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wand2,
  Video,
  Loader2,
  FileText,
  Link as LinkIcon,
  Building,
  Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { PhoneFrame } from "./PhoneFrame";
import { PreviewFeed } from "./PreviewFeed";
import { Video as VideoType } from "../types/video";
import { extractTextFromPdf, analyzeCompanyInfo } from "../utils/pdf";

export function UploadPage(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // Form inputs
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [generatedScript, setGeneratedScript] = useState("");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [scriptLanguage, setScriptLanguage] = useState<"ko" | "en">("ko");

  // Video upload states
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string>("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoType | null>(null);

  const hasRequiredInput = pdfFile || companyUrl || companyDescription;
  const canUpload =
    generatedVideoUrl &&
    videoTitle.trim() &&
    videoDescription.trim() &&
    !isUploading;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
    }
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      // First, crawl the website using the Edge Function
      let websiteContent = "";
      if (companyUrl) {
        try {
          const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
          const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const crawlResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/crawl-website`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({ url: companyUrl }),
            }
          );

          if (crawlResponse.ok) {
            const crawlData = await crawlResponse.json();
            websiteContent = `
MAIN PAGE
URL: ${crawlData.mainPage.url}
${"-".repeat(50)}
${crawlData.mainPage.title ? `Title: ${crawlData.mainPage.title}\n` : ""}${
              crawlData.mainPage.description
                ? `Description: ${crawlData.mainPage.description}\n`
                : ""
            }
Content:
${crawlData.mainPage.content}

${
  crawlData.subPages.length > 0 ? `\nSUBPAGES\n${"-".repeat(50)}\n` : ""
}${crawlData.subPages
              .map(
                (page: {
                  url: string;
                  title: string;
                  description: string;
                  content: string;
                }) => `
Page URL: ${page.url}
${page.title ? `Title: ${page.title}\n` : ""}${
                  page.description ? `Description: ${page.description}\n` : ""
                }
Content:
${page.content}
${"-".repeat(50)}`
              )
              .join("\n\n")}`.trim();
          } else {
            console.error("Failed to crawl website");
          }
        } catch (error) {
          console.error("Error crawling website:", error);
        }
      }

      // Create form data for the webhook request
      const formData = new FormData();
      formData.append("websiteContent", websiteContent);
      formData.append("companyDescription", companyDescription);
      formData.append("language", scriptLanguage);

      if (pdfFile) {
        formData.append("pdfFile", pdfFile);
      }

      const GEN_SCRIPT_N8N_URL = import.meta.env.VITE_GEN_SCRIPT_N8N_URL;
      // Send POST request to the webhook
      const response = await fetch(GEN_SCRIPT_N8N_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate script");
      }

      const data = await response.json();

      // Set the generated script from the response
      const script =
        data.script ||
        `Website Content:\n${websiteContent}\n\nCompany Description:\n${companyDescription}`;
      setGeneratedScript(script);
    } catch (error) {
      console.error("Error generating script:", error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!generatedScript.trim()) return;

    setIsLoading(true);
    setProgress(10);
    setStatusMessage("Initializing video generation...");

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

      // Get the user's session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token found");
      }

      setProgress(20);
      setStatusMessage("Preparing script for video generation...");

      // Call generate-heygen-video edge function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-heygen-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            script: generatedScript,
            language: scriptLanguage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate video");
      }

      setProgress(30);
      setStatusMessage("Video generation started...");

      const { video_id, polling_url, polling_interval } = await response.json();
      let currentProgress = 30;
      let pollCount = 0;

      // Start polling for video status
      const interval = setInterval(async () => {
        const statusResponse = await fetch(polling_url, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!statusResponse.ok) {
          clearInterval(interval);
          setIsLoading(false);
          throw new Error("Failed to check video status");
        }

        const { data: status } = await statusResponse.json();
        pollCount++;

        if (status.status === "completed" && status.video_url) {
          clearInterval(interval);
          setProgress(100);
          setStatusMessage("Video generation complete!");
          setGeneratedVideoUrl(status.video_url);
          setIsLoading(false);

          // Get user's profile data
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user?.id)
            .single();

          // Set preview video when generation is complete and we have a URL
          setPreviewVideo({
            title: "",
            description: "",
            video_url: status.video_url,
            is_liked: false,
            is_following: false,
            is_saved: false,
            id: "",
            views: 0,
            comment_count: 0,
            likes: 0,
            saved_count: 0,
            user_id: user?.id || "",
            created_at: new Date().toISOString(),
            profiles: {
              username: profile?.username || "anonymous",
              follower_count: 0,
              following_count: 0,
            },
          });
        } else if (status.status === "failed") {
          clearInterval(interval);
          setIsLoading(false);
          throw new Error("Video generation failed");
        } else {
          // Update progress based on poll count, but ensure it stays between 30-85%
          const progressIncrement = (85 - 30) / 20; // Divide remaining progress by expected number of polls
          currentProgress = Math.min(85, 30 + pollCount * progressIncrement);
          setProgress(currentProgress);

          // Update status message based on progress
          if (currentProgress < 50) {
            setStatusMessage("Processing script and preparing avatar...");
          } else if (currentProgress < 70) {
            setStatusMessage("Generating video animation...");
          } else {
            setStatusMessage("Adding final touches...");
          }
        }
      }, polling_interval);
    } catch (error) {
      console.error("Error generating video:", error);
      setStatusMessage(
        "Error: " +
          (error instanceof Error ? error.message : "Failed to generate video")
      );
      setIsLoading(false);
    }
  };

  const handleUploadVideo = async () => {
    if (!canUpload) return;

    setIsUploading(true);
    try {
      // Create video entry
      const { data: video } = await supabase
        .from("videos")
        .insert({
          user_id: user?.id,
          title: videoTitle,
          description: videoDescription,
          video_url: generatedVideoUrl,
        })
        .select("*, profiles(*)")
        .single();

      alert("upload success!");
    } catch (error) {
      console.error("Error uploading video:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="ml-16 lg:ml-64 p-8">
      <div className="flex gap-12">
        {/* Left Column - Form */}
        <div className="flex-1 max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            AI Studio
          </h1>

          {/* Progress bar */}
          {isLoading && (
            <div className="mb-8">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {statusMessage || "Generating video..."}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Input Section */}
            <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              {/* Left side inputs */}
              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="flex flex-col items-center justify-center h-[180px] border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isAnalyzingPdf ? (
                        <Loader2 className="w-10 h-10 mb-3 text-blue-500 animate-spin" />
                      ) : (
                        <FileText className="w-10 h-10 mb-3 text-blue-500" />
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {pdfFile ? pdfFile.name : "Upload Business Proposal"}
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileChange}
                      disabled={isLoading || isGeneratingScript}
                    />
                  </label>
                </div>

                {/* Company URL */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  <input
                    type="url"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    placeholder="Company Website"
                    className="pl-10 w-full h-[72px] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading || isGeneratingScript}
                  />
                </div>
              </div>

              {/* Right side input */}
              <div className="relative">
                <div className="absolute top-3 left-3">
                  <Building className="h-5 w-5 text-blue-500" />
                </div>
                <textarea
                  rows={11}
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  placeholder="Company Description"
                  className="pl-10 w-full h-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isLoading || isGeneratingScript}
                />
              </div>
            </div>

            {/* Language Selection */}
            <div className="flex justify-center items-center gap-2">
              <select
                value={scriptLanguage}
                onChange={(e) =>
                  setScriptLanguage(e.target.value as "ko" | "en")
                }
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || isGeneratingScript}
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                스크립트 언어
              </span>
            </div>

            {/* Generate Script Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerateScript}
                disabled={isLoading || isGeneratingScript || !hasRequiredInput}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingScript ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Script...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Script
                  </>
                )}
              </button>
            </div>

            {/* Script Section */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <textarea
                rows={6}
                value={generatedScript}
                onChange={(e) => setGeneratedScript(e.target.value)}
                placeholder="AI-generated pitch script will appear here..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Video Generation Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateVideo}
                disabled={isLoading || !generatedScript.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Generate Video
                  </>
                )}
              </button>
            </div>

            {/* Video Upload Section */}
            {generatedVideoUrl && (
              <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  rows={4}
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Enter video description"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleUploadVideo}
                    disabled={!canUpload}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Upload Video
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="w-[300px] flex-shrink-0 sticky top-8">
          <PhoneFrame>
            <PreviewFeed video={previewVideo} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}
