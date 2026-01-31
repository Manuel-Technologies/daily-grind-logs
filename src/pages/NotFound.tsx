import { Link } from "react-router-dom";
import { Terminal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Terminal className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">This page doesn't exist</p>
        <Button asChild className="bg-primary hover:bg-primary-hover text-primary-foreground">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to feed
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
