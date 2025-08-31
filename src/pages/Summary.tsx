import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, Share2, Heart, MessageCircle } from "lucide-react";

export default function Summary() {
  const location = useLocation();
  const navigate = useNavigate();
  const aiSummary = location.state?.aiSummary || localStorage.getItem("aiSummary");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Your Summary</h1>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Post-style Card */}
        <Card className="shadow-glow border border-border/50 overflow-hidden">
          {/* Post Header */}
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center shadow-soft">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-medium text-foreground">AI Assistant</CardTitle>
                  <p className="text-sm text-muted-foreground">Your monthly summary</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Just now</div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Summary Content */}
            <div className="mb-6">
              <div className="bg-gradient-subtle rounded-lg p-6 border border-border/30">
                {aiSummary ? (
                  <div className="text-foreground leading-relaxed whitespace-pre-line">
                    {aiSummary}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No summary available yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Create a life update to get your AI summary!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border/30">
              <div className="flex items-center gap-6">
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-accent">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">42</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Comment</span>
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <Button 
            onClick={() => navigate('/life-updates')}
            className="flex-1 bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-warm transition-all duration-300"
          >
            Create New Update
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/')}
            className="px-6"
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}