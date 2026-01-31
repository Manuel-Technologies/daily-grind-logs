import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Terminal, Users, Flame, CheckCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">CommitLog</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth?mode=login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Link to="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-14">
        <section className="container max-w-4xl py-24 text-center">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center glow-primary">
              <Terminal className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
            Public logs of real work
          </h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            CommitLog is the social network for builders. Post daily work logs, build in public, stay consistent.
          </p>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Like X, but for grinders. Same mechanics. Different purpose.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-8">
              <Link to="/auth?mode=signup">Start Logging</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border text-foreground hover:bg-secondary">
              <Link to="/auth?mode=login">Sign In</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="container max-w-4xl py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-primary-muted flex items-center justify-center mb-4">
                <Terminal className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Daily Logs</h3>
              <p className="text-muted-foreground text-sm">
                Post what you worked on today. Short, focused updates that show your progress.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-primary-muted flex items-center justify-center mb-4">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Build Consistency</h3>
              <p className="text-muted-foreground text-sm">
                Track your posting streak. Consistency beats intensity. Show up every day.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-primary-muted flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Connect with Builders</h3>
              <p className="text-muted-foreground text-sm">
                Follow other builders. Like, comment, and relog their work. Build in public together.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container max-w-2xl py-16">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">How it works</h2>
          <div className="space-y-6">
            {[
              "Sign up with your email",
              "Post what you worked on today",
              "Follow other builders in your space",
              "Stay consistent, build your streak",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <span className="text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container max-w-2xl py-20 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to start logging?</h2>
          <p className="text-muted-foreground mb-8">Join builders who ship daily and document their journey.</p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-10">
            <Link to="/auth?mode=signup">Create Your Account</Link>
          </Button>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8">
          <div className="container text-center text-muted-foreground text-sm">
            <p>© {new Date().getFullYear()} CommitLog. Built for builders.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
