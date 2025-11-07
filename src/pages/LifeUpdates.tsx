import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              ← Back to Home
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Life Updates</h1>
          <p className="text-muted-foreground">
            Share what you've been up to this month and get an AI-powered summary
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Create New Update
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Title
              </label>
              <Input
                placeholder="e.g., January 2024 Adventures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What did you do this month?
              </label>
              <Textarea
                placeholder="Tell us about your experiences, achievements, travels, or anything memorable from this month..."
                value={userSummary}
                onChange={(e) => setUserSummary(e.target.value)}
                rows={6}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Photos (optional)
              </label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="cursor-pointer"
              />
              {photoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {photoPreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img
                        src={src}
                        alt={`Upload ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving & Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Save & Generate AI Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {aiSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed">{aiSummary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}