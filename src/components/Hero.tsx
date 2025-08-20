import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-friends.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-subtle overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
      <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-accent/20 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">Stay close,</span>
                <br />
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  even when life gets hectic
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Never lose touch with the people who matter most. Our AI-powered platform 
                helps you maintain meaningful friendships without the effort.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto"
                onClick={() => navigate('/life-updates')}
              >
                Start Connecting
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 h-auto">
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10k+</div>
                <div className="text-sm text-muted-foreground">Friendships maintained</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground">Stay connected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">5 min</div>
                <div className="text-sm text-muted-foreground">Setup time</div>
              </div>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-glow">
              <img 
                src={heroImage} 
                alt="Friends staying connected through AI-powered updates" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 bg-card p-4 rounded-xl shadow-soft animate-float border">
              <div className="text-sm font-medium text-foreground">✨ AI Update Generated</div>
              <div className="text-xs text-muted-foreground mt-1">"Had an amazing weekend..."</div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-accent text-accent-foreground p-3 rounded-lg shadow-warm animate-float" style={{ animationDelay: '1s' }}>
              <div className="text-xs font-medium">📅 Next check-in: Tomorrow</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;