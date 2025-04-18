
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsProcessing(true);
      
      // Create the full absolute URL for reset password
      // Use explicit production URL if in production environment
      const isProduction = window.location.hostname.includes('ontario-loans.com');
      
      let resetUrl = '';
      if (isProduction) {
        // Use the PasswordReset route instead of reset-password
        resetUrl = 'https://ontario-loans.com/PasswordReset';
      } else {
        resetUrl = `${window.location.origin}/PasswordReset`;
      }
      
      console.log("Setting password reset redirect URL to:", resetUrl);
      console.log("Current environment:", isProduction ? "production" : "development/staging");
      console.log("Current origin:", window.location.origin);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });
      
      if (error) {
        console.error("Password reset error:", error);
        toast.error(error.message || "There was a problem sending the password reset email.");
        throw error;
      }
      
      console.log("Password reset response:", data);
      setIsSubmitted(true);
      toast.success("Password reset link sent to your email");
      
      // Log for debugging purposes
      console.log("Reset password redirect URL:", resetUrl);
    } catch (error: any) {
      console.error("Password reset error details:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-16 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
              <CardDescription className="text-center">
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            
            {isSubmitted ? (
              <CardContent className="text-center py-6">
                <p className="mb-4">
                  Password reset instructions have been sent to <span className="font-medium">{email}</span>. 
                  Please check your inbox and follow the instructions to reset your password.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  If you don't see the email, please check your spam folder.
                </p>
                <Link to="/dealers">
                  <Button className="mt-4 bg-ontario-blue hover:bg-ontario-blue/90">
                    Return to Login
                  </Button>
                </Link>
              </CardContent>
            ) : (
              <form onSubmit={handleResetPassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="your@email.com"
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-ontario-blue hover:bg-ontario-blue/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Sending Instructions..." : "Send Reset Instructions"}
                  </Button>
                  
                  <Link to="/dealers" className="w-full">
                    <Button variant="outline" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </CardFooter>
              </form>
            )}
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ForgotPassword;
