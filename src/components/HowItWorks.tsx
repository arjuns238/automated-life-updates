const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      title: "Share your moments",
      description: "Upload photos, jot down bullet points, or record voice notes about your life updates.",
      icon: "📸"
    },
    {
      number: "02", 
      title: "AI crafts your story",
      description: "Our AI transforms your inputs into natural, engaging updates that sound authentically you.",
      icon: "🤖"
    },
    {
      number: "03",
      title: "Choose your audience",
      description: "Select which friends or groups should receive each update. Full control over who sees what.",
      icon: "👥"
    },
    {
      number: "04",
      title: "Automatic sharing",
      description: "Updates are sent on your chosen schedule. Your friends stay connected without you lifting a finger.",
      icon: "📤"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Effortless connection in 4 simple steps
          </h2>
          <p className="text-xl text-muted-foreground">
            No more forgetting to reach out. No more awkward "it's been too long" messages.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent transform translate-x-4 z-0"></div>
              )}
              
              <div className="relative bg-card p-8 rounded-2xl shadow-soft border hover:shadow-glow transition-smooth text-center group-hover:scale-105 z-10">
                <div className="text-sm font-bold text-primary mb-2">
                  {step.number}
                </div>
                
                <div className="text-4xl mb-4">
                  {step.icon}
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-4">
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-hero text-primary-foreground px-8 py-4 rounded-2xl shadow-glow">
            <p className="text-lg font-medium">
              Setup takes less than 5 minutes. Your first update can go out today.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;