import { supabase } from '@/integrations/supabase/client';
import { DealerPurchase } from '@/lib/types/dealer-dashboard';
import { toast } from 'sonner';

/**
 * Fetches all dealer purchases
 */
export const fetchDealerPurchases = async (dealerId: string): Promise<DealerPurchase[]> => {
  try {
    console.log(`Fetching purchases for dealer ${dealerId}`);
    
    // Use direct table query instead of RPC function to avoid the GROUP BY issue
    const { data, error } = await supabase
      .from('dealer_purchases')
      .select(`
        id, 
        application_id, 
        payment_id,
        payment_amount,
        purchase_date,
        downloaded_at,
        download_count,
        stripe_session_id,
        discount_applied,
        discount_type,
        discount_amount
      `)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .order('purchase_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching dealer purchases:', error);
      throw error;
    }
    
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data format returned from dealer_purchases query:', data);
      return [];
    }
    
    console.log(`Retrieved ${data.length} dealer purchases from database`);
    
    // Transform to match the DealerPurchase interface
    return data.map(purchase => ({
      id: purchase.id,
      applicationId: purchase.application_id,
      purchaseDate: purchase.purchase_date,
      paymentId: purchase.payment_id,
      paymentAmount: purchase.payment_amount,
      downloadedAt: purchase.downloaded_at,
      downloadCount: purchase.download_count,
      discountApplied: purchase.discount_applied || false,
      discountType: purchase.discount_type,
      discountAmount: purchase.discount_amount
    }));
  } catch (error: any) {
    console.error('❌ Error fetching dealer purchases:', error.message);
    toast.error('Failed to load your purchases');
    return [];
  }
};

/**
 * Records a dealer purchase
 */
export const recordDealerPurchase = async (
  dealerId: string,
  applicationId: string,
  paymentId: string,
  paymentAmount: number,
  stripeSessionId?: string,
  discountApplied?: boolean,
  discountType?: string,
  discountAmount?: number
): Promise<boolean> => {
  try {
    console.log(`Recording purchase for application ${applicationId} by dealer ${dealerId}`);
    
    const { data, error } = await supabase.rpc('record_dealer_purchase', {
      p_dealer_id: dealerId,
      p_application_id: applicationId,
      p_payment_id: paymentId,
      p_payment_amount: paymentAmount,
      p_stripe_session_id: stripeSessionId,
      p_discount_applied: discountApplied || false,
      p_discount_type: discountType,
      p_discount_amount: discountAmount
    });
    
    if (error) {
      console.error('Error recording dealer purchase:', error);
      throw error;
    }
    
    console.log('Purchase record result:', data);
    
    return data?.success || false;
  } catch (error: any) {
    console.error('❌ Error recording dealer purchase:', error.message);
    toast.error(`Failed to record purchase: ${error.message}`);
    return false;
  }
};

/**
 * Checks if an application has been purchased by the dealer
 */
export const isApplicationPurchased = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Checking if application ${applicationId} has been purchased by dealer ${dealerId}`);
    
    const { data, error } = await supabase
      .from('dealer_purchases')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('application_id', applicationId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking purchase status:', error);
      throw error;
    }
    
    return !!data;
  } catch (error: any) {
    console.error('❌ Error checking purchase status:', error.message);
    return false;
  }
};

/**
 * Records a download for a purchased application
 */
export const recordPurchaseDownload = async (applicationId: string, dealerId: string): Promise<boolean> => {
  try {
    console.log(`Recording download for purchased application ${applicationId} by dealer ${dealerId}`);
    
    const { data, error } = await supabase.rpc('mark_purchase_downloaded', {
      p_dealer_id: dealerId,
      p_application_id: applicationId
    });
    
    if (error) {
      console.error('Error recording purchase download:', error);
      throw error;
    }
    
    console.log('Download record result:', data);
    
    return data?.success || false;
  } catch (error: any) {
    console.error('❌ Error recording purchase download:', error.message);
    return false;
  }
};

/**
 * Gets a list of purchased application IDs for a dealer
 */
export const getPurchasedApplicationIds = async (dealerId: string): Promise<string[]> => {
  try {
    console.log(`Fetching purchased application IDs for dealer ${dealerId}`);
    
    const { data, error } = await supabase
      .from('dealer_purchases')
      .select('application_id')
      .eq('dealer_id', dealerId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching purchased application IDs:', error);
      throw error;
    }
    
    const ids = (data || []).map(item => item.application_id);
    console.log(`Loaded ${ids.length} purchased application IDs`);
    return ids;
  } catch (error: any) {
    console.error('❌ Error fetching purchased application IDs:', error.message);
    return [];
  }
};
