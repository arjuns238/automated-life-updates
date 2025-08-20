import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float"></div>
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-white/20 rounded-full blur-xl animate-float" style={{ animationDelay: '3s' }}></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Never lose touch with the people who matter most
          </h2>
          
          <p className="text-xl text-primary-foreground/90 leading-relaxed mb-12 max-w-2xl mx-auto">
            Join thousands of people who are staying meaningfully connected with their friends, 
            even when life gets busy. Start your first AI-powered update today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Button 
              variant="warm" 
              size="lg" 
              className="text-lg px-10 py-6 h-auto bg-white text-primary hover:bg-white/90 shadow-warm"
              onClick={() => navigate('/life-updates')}
            >
              Start Free Trial
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-10 py-6 h-auto border-white/30 text-primary-foreground hover:bg-white/10"
            >
              Schedule Demo
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-primary-foreground/80">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-sm">Free 30-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-sm">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;