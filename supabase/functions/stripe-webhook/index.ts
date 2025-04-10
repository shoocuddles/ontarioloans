
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@14.20.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    
    // Get the signature from the header
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Get the event data
    const body = await req.text();
    
    // Verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Process the successful payment
      await handleSuccessfulPayment(session, supabase);
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error handling webhook: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function handleSuccessfulPayment(session, supabase) {
  const dealerId = session.metadata?.dealer_id;
  const applicationIdsString = session.metadata?.application_ids;
  
  if (!dealerId || !applicationIdsString) {
    console.error("Missing dealer_id or application_ids in session metadata");
    return;
  }
  
  const applicationIds = applicationIdsString.split(',');
  const unitPrice = parseFloat(session.metadata?.unit_price || "0");
  
  console.log(`Processing webhook payment for dealer ${dealerId}, applications count: ${applicationIds.length}`);
  
  // Process each application
  for (const appId of applicationIds) {
    try {
      // Record the purchase in the dealer_purchases table
      const { data: purchaseData, error: purchaseError } = await supabase.rpc(
        'record_dealer_purchase',
        {
          p_dealer_id: dealerId,
          p_application_id: appId,
          p_payment_id: session.id,
          p_payment_amount: unitPrice,
          p_stripe_session_id: session.id,
          p_stripe_customer_id: session.customer,
          p_discount_applied: session.metadata?.has_discount === 'true',
          p_discount_type: session.metadata?.discount_type,
          p_discount_amount: session.metadata?.discount_amount ? parseFloat(session.metadata.discount_amount) : null
        }
      );
      
      if (purchaseError) {
        console.error(`Error recording purchase for ${appId}:`, purchaseError);
        continue;
      }
      
      console.log(`Purchase recorded for application ${appId}:`, purchaseData?.is_new ? 'New purchase' : 'Already purchased');
      
      // Apply automatic lock (24 hours for purchased applications)
      const lockExpiry = new Date();
      lockExpiry.setHours(lockExpiry.getHours() + 24);
      
      // Check for any existing active locks for this application
      const { data: existingLocks } = await supabase
        .from('application_locks')
        .select('*')
        .eq('application_id', appId)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false });
      
      // Remove any existing locks by other dealers (this application is now purchased)
      if (existingLocks && existingLocks.length > 0) {
        // Log count instead of individual locks
        console.log(`Removing ${existingLocks.filter(l => l.dealer_id !== dealerId).length} existing locks by other dealers for application ${appId}`);
        
        for (const lock of existingLocks) {
          if (lock.dealer_id !== dealerId) {
            await supabase
              .from('application_locks')
              .update({ expires_at: new Date().toISOString() })
              .eq('id', lock.id);
          }
        }
      }
      
      // Check specifically for existing lock by this dealer
      const { data: existingDealerLocks } = await supabase
        .from('application_locks')
        .select('*')
        .eq('application_id', appId)
        .eq('dealer_id', dealerId)
        .gt('expires_at', new Date().toISOString())
        .limit(1);
      
      // If there's already an active lock by this dealer, don't create a new one
      if (existingDealerLocks && existingDealerLocks.length > 0) {
        console.log(`Dealer already has an active lock on application ${appId}`);
        continue;
      }
      
      // Create a new lock for the dealer
      console.log(`Creating purchase lock for application ${appId}`);
      
      const { data: lockData, error: lockError } = await supabase
        .from('application_locks')
        .insert({
          application_id: appId,
          dealer_id: dealerId,
          lock_type: 'purchase_lock',
          expires_at: lockExpiry.toISOString(),
          is_paid: true,
          payment_id: session.id,
          payment_amount: 0 // No extra charge for the initial lock
        })
        .select()
        .single();
      
      if (lockError) {
        console.error(`Error creating lock for ${appId}:`, lockError);
      }
    } catch (error) {
      console.error(`Error processing application ${appId}:`, error);
    }
  }
  
  console.log(`Completed webhook processing for ${applicationIds.length} applications`);
}
