import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Loader2, Upload, Sparkles, X } from "lucide-react";

export default function LifeUpdates() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [userSummary, setUserSummary] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const { toast } = useToast();

  // const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files ? Array.from(e.target.files) : [];
  //   if (!files.length) return;

  //   setPhotos((prev) => [...prev, ...files]);
  //   const newPreviews = files.map((f) => URL.createObjectURL(f));
  //   setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  // };

//   const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//   const files = e.target.files ? Array.from(e.target.files) : [];
//   console.log("Uploaded files:", files); // Debugging
//   if (!files.length) return;

//   setPhotos(prev => [...prev, ...files]);
//   const newPreviews = files.map(f => URL.createObjectURL(f));
//   console.log("Generated previews:", newPreviews); // Debugging
//   setPhotoPreviews(prev => [...prev, ...newPreviews]);
// };

const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : [];
  if (!files.length) return;

  // Log file details for debugging
  files.forEach((file) => {
    console.log("File uploaded:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`, // Convert size to KB
    });
  });

  setPhotos((prev) => [...prev, ...files]);
  const newPreviews = files.map((f) => URL.createObjectURL(f));
  setPhotoPreviews((prev) => [...prev, ...newPreviews]);
};
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !userSummary.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and summary",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save your life update",
          variant: "destructive",
        });
        return;
      }

      // Insert the life update
      const { data, error } = await supabase
        .from("life_updates")
        .insert({
          user_id: user.id,
          title: title.trim(),
          user_summary: userSummary.trim(),
          // photos: photos,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate AI summary using Python backend
      let summaryData = null;
      let summaryError = null;

      try {
        const fd = new FormData();
        fd.append("user_summary", userSummary.trim());
        fd.append("update_id", String(data.id));
        photos.forEach((file) => fd.append("photos", file, file.name));

        const response = await fetch("http://localhost:8000/summarize-update", {
          method: "POST",
          body: fd, // IMPORTANT: no manual Content-Type header
          // credentials / headers as needed (CORS, auth, etc.)
        });
        // try {
        // console.log("Sending to backend:", {
        //   user_summary: userSummary.trim(),
        //   update_id: data.id,
        // });
        //   const response = await fetch("http://localhost:8000/summarize-update", {
        //     method: "POST",
        //     headers: { "Content-Type": "application/json" },
        //     // body: JSON.stringify({
        //     //   user_summary: userSummary.trim(),
        //     //   update_id: data.id,
        //     //   photos: photos
        //     // }),
        //     body: formData
        //   });
        summaryData = await response.json();
        console.log("Received from backend:", summaryData);
        if (!response.ok) throw new Error(summaryData.detail || "AI summary failed");
      } catch (err) {
        summaryError = err;
      }

      if (summaryError) {
        console.error("AI summary error:", summaryError);
        toast({
          title: "Update saved",
          description: "Your update was saved, but AI summary failed to generate",
        });
      } else {
        setAiSummary(summaryData.ai_summary);
        toast({
          title: "Success!",
          description: "Your life update has been saved and summarized",
        });
        console.log("At LifeUpdates.tsx -> Navigating to summary with:", summaryData.ai_summary);
        localStorage.setItem("aiSummary", summaryData.ai_summary);
        localStorage.setItem("photo_urls", JSON.stringify(summaryData.photo_urls));
        localStorage.setItem("last_update_id", String(summaryData.updateId)); // handy for the fallback fetch
        navigate("/summary", { state: { aiSummary: summaryData.ai_summary, photo_urls: summaryData.photo_urls, update_id: summaryData.updateId } });
      }

      // Reset form
      setTitle("");
      setUserSummary("");
      setPhotos([]);
    } catch (error) {
      console.error("Error saving update:", error);
      toast({
        title: "Error",
        description: "Failed to save your update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.12),transparent_25%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#ffffff0f_1px,transparent_0)] [background-size:36px_36px]" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/home")}
              className="rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              ← Back
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-blue-100 shadow-inner shadow-blue-500/10">
              <Sparkles className="h-4 w-4" />
              Life Updates
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/80">
            <Activity className="h-4 w-4 text-green-300" />
            AI ready to summarize
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-semibold leading-tight text-white">Share what happened</h1>
          <p className="max-w-3xl text-slate-300">
            Capture your highlights, add photos, and let your AI friend craft a polished recap fit for sharing.
          </p>
        </div>

        <Card className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Upload className="h-5 w-5" />
              Create New Update
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Title
              </label>
              <Input
                placeholder="e.g., January 2024 Adventures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                What did you do this month?
              </label>
              <Textarea
                placeholder="Tell us about your experiences, achievements, travels, or anything memorable from this month..."
                value={userSummary}
                onChange={(e) => setUserSummary(e.target.value)}
                rows={6}
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Photos (optional)
              </label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="cursor-pointer border-white/10 bg-white/5 text-white file:text-white"
              />
              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {photoPreviews.map((src, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-inner shadow-blue-900/20"
                    >
                      <img
                        src={src}
                        alt={`Upload ${i + 1}`}
                        className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <button
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute right-2 top-2 rounded-full bg-white/15 p-1 text-white backdrop-blur hover:bg-white/25"
                        aria-label="Remove photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400 text-white shadow-glow transition-all hover:shadow-blue-500/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving & Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save & Generate AI Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {aiSummary && (
          <Card className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-blue-200" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-slate-100">{aiSummary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
