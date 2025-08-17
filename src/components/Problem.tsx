const Problem = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            We've all been there
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-12">
            Life gets busy. Work, family, commitments pile up. Before you know it, 
            months have passed since you last spoke to that friend who means the world to you.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-8 bg-card rounded-2xl shadow-soft border">
            <div className="text-4xl mb-4">😔</div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Good intentions, poor follow-through
            </h3>
            <p className="text-muted-foreground">
              You think about reaching out, but never find the right time or words.
            </p>
          </div>
          
          <div className="text-center p-8 bg-card rounded-2xl shadow-soft border">
            <div className="text-4xl mb-4">⏰</div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Time slips away
            </h3>
            <p className="text-muted-foreground">
              Weeks turn into months. The longer you wait, the more awkward it feels.
            </p>
          </div>
          
          <div className="text-center p-8 bg-card rounded-2xl shadow-soft border">
            <div className="text-4xl mb-4">💔</div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Relationships fade
            </h3>
            <p className="text-muted-foreground">
              Meaningful friendships slowly drift apart, leaving you feeling disconnected.
            </p>
          </div>
        </div>
        
        <div className="text-center mt-16">
          <div className="inline-block bg-gradient-warm text-accent-foreground px-8 py-4 rounded-2xl shadow-warm">
            <p className="text-lg font-medium">
              What if staying connected was as easy as taking a photo?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Problem;