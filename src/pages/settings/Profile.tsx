import React, { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Mail, User, Lock, Upload, X } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch user + profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Auth error:", authError);
        setLoading(false);
        return;
      }
      setUser(user);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Determine default avatar (DiceBear) using user.id for consistent random avatar
      const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`;

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setAvatarUrl(defaultAvatar);
      } else if (data) {
        setProfile(data);
        setUsername(data.username || "");
        setDisplayName(data.display_name || "");
        setAvatarUrl(data.avatar_url || defaultAvatar);
      } else {
        setAvatarUrl(defaultAvatar);
      }

      setLoading(false);
    };

    fetchProfile();
  }, []);

  if (loading) return <p>Loading profile...</p>;

  // Avatar handlers
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAvatarUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    if (!user) return;
    setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`);
  };

  // Save changes
  const handleSave = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    if (error) console.error("Error saving profile:", error);
    else alert("Profile updated successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header with editable avatar */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div onClick={handleAvatarClick} className="relative cursor-pointer group">
            <Avatar className="h-20 w-20">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Profile picture" />
              ) : (
                <AvatarFallback>{displayName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              )}
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition">
              <Upload className="h-5 w-5 text-white" />
            </div>
          </div>
          {avatarUrl && !avatarUrl.includes("dicebear") && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
              aria-label="Remove avatar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Click avatar to change</p>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </Label>
            <Input id="email" type="email" value={user?.email || ""} disabled />
          </div>

          <div>
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Username
            </Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          {/* <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div> */}

          <div>
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> New Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password (not implemented yet)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
