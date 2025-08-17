import aiIcon from "@/assets/ai-icon.jpg";
import scheduleIcon from "@/assets/schedule-icon.jpg";
import privacyIcon from "@/assets/privacy-icon.jpg";

const Features = () => {
  const features = [
    {
      icon: aiIcon,
      title: "AI-Powered Summaries",
      description: "Upload photos, bullet points, or voice notes. Our AI transforms them into natural, engaging updates that sound authentically you.",
      gradient: "bg-gradient-hero"
    },
    {
      icon: scheduleIcon,
      title: "Scheduled Sharing",
      description: "Set it and forget it. Automated recurring check-ins ensure your friends stay in the loop without you having to remember.",
      gradient: "bg-gradient-warm"
    },
    {
      icon: privacyIcon,
      title: "Privacy First",
      description: "Your content is secure and shared only with chosen recipients. Control exactly who sees what, with full transparency.",
      gradient: "bg-primary"
    }
  ];

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            AI that strengthens real human connection
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Our platform acts like your personal friendship maintenance assistant, 
            keeping relationships alive with genuine-feeling updates.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-card p-8 rounded-2xl shadow-soft border hover:shadow-glow transition-smooth group"
            >
              <div className={`w-16 h-16 ${feature.gradient} rounded-xl mb-6 flex items-center justify-center group-hover:scale-110 transition-smooth overflow-hidden`}>
                <img 
                  src={feature.icon} 
                  alt={feature.title}
                  className="w-10 h-10 object-cover rounded-lg"
                />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-4">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <div className="inline-block bg-card px-8 py-6 rounded-2xl shadow-soft border">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Personalized for Each Friend Group
            </h3>
            <p className="text-muted-foreground">
              Different updates for different circles. Work friends get professional updates, 
              family gets personal ones, college friends get the fun stuff.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;