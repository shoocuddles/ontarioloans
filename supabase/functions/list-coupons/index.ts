
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey) {
      console.error("Stripe secret key not found in environment variables");
      return new Response(
        JSON.stringify({ 
          error: {
            message: "Stripe secret key not configured",
            details: "The STRIPE_SECRET_KEY environment variable is not set in the edge function secrets."
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }
    
    console.log("Initializing Stripe with provided secret key...");
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    console.log("Fetching coupons from Stripe");
    
    try {
      const coupons = await stripe.coupons.list({ limit: 100 });
      
      console.log(`Successfully retrieved ${coupons.data.length} coupons`);
      
      return new Response(
        JSON.stringify(coupons.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError) {
      console.error("Stripe API error:", stripeError);
      
      // Check if it's an authentication error
      if (stripeError.type === 'StripeAuthenticationError' || 
          stripeError.message?.includes('invalid api key') ||
          stripeError.message?.includes('API key')) {
        return new Response(
          JSON.stringify({ 
            error: {
              message: "Invalid Stripe API key",
              details: "Your Stripe API key appears to be invalid or has insufficient permissions."
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      
      // Generic Stripe API error
      return new Response(
        JSON.stringify({ 
          error: {
            message: "Stripe API error", 
            details: stripeError.message 
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return new Response(
      JSON.stringify({ 
        error: {
          message: error.message,
          details: "An unexpected error occurred while processing the request."
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
