import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ApplicationItem, DownloadedApplication, LockType, LockoutPeriod, SystemSettings } from '@/lib/types/dealer-dashboard';
import DealerDashboardLayout from '@/components/DealerDashboardLayout';
import ApplicationTable from '@/components/application-table/ApplicationTable';
import ApplicationOptions from '@/components/application-table/ApplicationOptions';
import DownloadedApplications from '@/components/DownloadedApplications';
import DealerProfile from '@/components/DealerProfile';
import BulkActionsBar from '@/components/BulkActionsBar';
import ApplicationDetails from '@/components/ApplicationDetails';
import DealerInvoices from '@/components/DealerInvoices';
import { useSearchParams } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';

const generateApplicationPDF = (application: { 
  id: string; 
  fullName: string; 
  created_at: string;
  status: string;
}) => {
  console.log('Generating PDF for application:', application);
  
  const text = `
    Application ID: ${application.id}
    Name: ${application.fullName}
    Date: ${new Date(application.created_at).toLocaleDateString()}
    Status: ${application.status}
  `;
  
  return new Blob([text], { type: 'application/pdf' });
};

const processLocksAfterPayment = async (
  applicationIds: string[], 
  lockType: LockType, 
  paymentId: string, 
  amount: number
): Promise<number> => {
  let locksProcessed = 0;
  
  for (const appId of applicationIds) {
    try {
      const lockSuccess = await lockApplication(appId, lockType);
      if (lockSuccess) {
        locksProcessed++;
      }
    } catch (error) {
      console.error(`Error locking application ${appId} after payment:`, error);
    }
  }
  
  console.log(`Successfully locked ${locksProcessed} applications after payment ${paymentId} for $${amount}`);
  return locksProcessed;
};

const DealerDashboard = () => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [downloadedApps, setDownloadedApps] = useState<DownloadedApplication[]>([]);
  const [hiddenApplications, setHiddenApplications] = useState<ApplicationItem[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDownloaded, setIsLoadingDownloaded] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'download' | 'lock';
    applicationIds: string[];
    lockType?: LockType;
  } | null>(null);
  const [detailsApplication, setDetailsApplication] = useState<ApplicationItem | DownloadedApplication | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lockOptions, setLockOptions] = useState<{ id: number, name: string, type: LockType, fee: number }[]>([
    { id: 1, name: '24 Hours', type: '24hours', fee: 4.99 },
    { id: 2, name: '1 Week', type: '1week', fee: 9.99 },
    { id: 3, name: 'Permanent', type: 'permanent', fee: 29.99 }
  ]);
  const [ageDiscountSettings, setAgeDiscountSettings] = useState<AgeDiscountSettings>({
    isEnabled: false,
    daysThreshold: 30,
    discountPercentage: 25
  });
  const [activeApplicationTab, setActiveApplicationTab] = useState<'visible' | 'hidden'>('visible');
  const [purchasedApplicationIds, setPurchasedApplicationIds] = useState<string[]>([]);
  
  const [hideOlderThan90Days, setHideOlderThan90Days] = useState<boolean>(true);
  const [hideLockedApplications, setHideLockedApplications] = useState<boolean>(false);
  const [hidePurchasedApplications, setHidePurchasedApplications] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  
  const selectionBeforePayment = useRef<string[]>([]);
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('payment_success') === 'true';
  const paymentCancelled = searchParams.get('payment_cancelled') === 'true';
  const sessionId = searchParams.get('session_id');

  const { user } = useAuth();
  
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingDownloaded(true);
    
    try {
      await loadPurchasedApplicationIds();
      
      const downloadedData = await fetchDownloadedApplications(user?.id || '');
      console.log('Downloaded applications data:', downloadedData && Array.isArray(downloadedData) ? downloadedData.length : 0);
      
      const downloadedAppsList = Array.isArray(downloadedData) ? downloadedData : [];
      setDownloadedApps(downloadedAppsList);
      
      if (downloadedAppsList.length > 0) {
        console.log('Sample downloaded application:', {
          id: downloadedAppsList[0].id,
          applicationId: downloadedAppsList[0].applicationId,
          fullName: downloadedAppsList[0].fullName,
          email: downloadedAppsList[0].email,
          downloadDate: downloadedAppsList[0].downloadDate
        });
      }
      
      const downloadedAppIds = downloadedAppsList.map(app => app.applicationId);
      console.log('Downloaded application IDs:', downloadedAppIds.length);
      
      const appsData = await fetchAvailableApplications(user?.id || '');
      console.log('Loaded applications with lock info:', appsData.map(app => ({
        id: app.applicationId,
        lockInfo: app.lockInfo,
        isDownloaded: app.isDownloaded,
        isPurchased: app.isPurchased
      })));
      
      let filteredApps = appsData.filter(app => {
        if (hidePurchasedApplications && (app.isPurchased || purchasedApplicationIds.includes(app.applicationId) || downloadedAppIds.includes(app.applicationId))) {
          return false;
        }
        
        if (hideLockedApplications && app.lockInfo?.isLocked && !app.lockInfo?.isOwnLock) {
          return false;
        }
        
        if (hideOlderThan90Days && app.submissionDate) {
          const submissionDate = parseISO(app.submissionDate);
          const ageDays = differenceInDays(new Date(), submissionDate);
          if (ageDays > 90) {
            return false;
          }
        }
        
        return true;
      });
      
      filteredApps.sort((a, b) => {
        const dateA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
        const dateB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        return dateB - dateA;
      });
      
      const hiddenAppIds = hiddenApplications.map(app => app.applicationId);
      const visibleApps = filteredApps.filter(app => !hiddenAppIds.includes(app.applicationId));
      
      setApplications(visibleApps);
      
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data. Please try again.");
      setDownloadedApps([]);
    } finally {
      setIsLoading(false);
      setIsLoadingDownloaded(false);
    }
  }, [user?.id, hideOlderThan90Days, hideLockedApplications, hidePurchasedApplications, hiddenApplications, purchasedApplicationIds]);

  useEffect(() => {
    if (user) {
      loadData();
      loadLockOptions();
      loadSystemSettings();
      loadPurchasedApplicationIds();
    }
  }, [user, loadData]);

  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
    
    if (autoRefresh && user) {
      autoRefreshTimerRef.current = setInterval(() => {
        console.log('Auto-refreshing applications data...');
        loadData();
      }, 60000);
    }
    
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, user, loadData]);

  const loadPurchasedApplicationIds = async () => {
    if (!user?.id) return;
    
    try {
      const ids = await getPurchasedApplicationIds(user.id);
      setPurchasedApplicationIds(ids);
      console.log(`Loaded ${ids.length} purchased application IDs`);
    } catch (error) {
      console.error("Error loading purchased application IDs:", error);
    }
  };
  
  const loadSystemSettings = async () => {
    try {
      const settings = await fetchSystemSettings();
      if (settings) {
        setAgeDiscountSettings({
          isEnabled: settings.ageDiscountEnabled || false,
          daysThreshold: settings.ageDiscountThreshold || 30,
          discountPercentage: settings.ageDiscountPercentage || 25
        });
        console.log("Age discount settings loaded successfully");
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
    }
  };
  
  useEffect(() => {
    const handlePaymentResult = async () => {
      const shouldClearParams = paymentSuccess || paymentCancelled;
      
      if (paymentSuccess && sessionId) {
        try {
          toast.loading("Verifying your purchase...");
          const result = await completePurchase(sessionId);
          
          if (result.error) {
            console.error("Error completing purchase:", result.error);
            toast.error("There was an issue processing your payment confirmation. Please contact support.");
          } else {
            const pendingLockApplications = sessionStorage.getItem('pendingLockApplications');
            const pendingLockType = sessionStorage.getItem('pendingLockType') as LockType;
            
            if (pendingLockApplications && pendingLockType) {
              try {
                const applicationIds = JSON.parse(pendingLockApplications);
                if (Array.isArray(applicationIds) && applicationIds.length > 0) {
                  const paymentId = result.data && 'paymentId' in result.data 
                    ? (result.data.paymentId as string) 
                    : sessionId || 'unknown';
                  
                  const amount = result.data && 'amount' in result.data 
                    ? (result.data.amount as number) 
                    : 0;
                  
                  const locksProcessed = await processLocksAfterPayment(
                    applicationIds, 
                    pendingLockType, 
                    paymentId, 
                    amount
                  );
                  
                  if (locksProcessed > 0) {
                    toast.success(`Successfully locked ${locksProcessed} application(s)`);
                    sessionStorage.removeItem('pendingLockApplications');
                    sessionStorage.removeItem('pendingLockType');
                  }
                }
              } catch (lockError) {
                console.error("Error processing locks after payment:", lockError);
              }
            } else {
              toast.success("Payment processed successfully. Your applications are now available in the Purchased tab.");
            }
            
            await loadData();
            await loadPurchasedApplicationIds();
            
            if (selectionBeforePayment.current.length > 0) {
              setTimeout(() => {
                setSelectedApplications(selectionBeforePayment.current);
                selectionBeforePayment.current = [];
              }, 500);
            }
          }
        } catch (error) {
          console.error("Exception completing purchase:", error);
          toast.error("An unexpected error occurred while processing your payment confirmation.");
        } finally {
          toast.dismiss();
        }
      } else if (paymentSuccess) {
        toast.success("Payment processed successfully. Your applications are now available in the Purchased tab.");
        await loadData();
        await loadPurchasedApplicationIds();
        
        if (selectionBeforePayment.current.length > 0) {
          setTimeout(() => {
            setSelectedApplications(selectionBeforePayment.current);
            selectionBeforePayment.current = [];
          }, 500);
        }
      } else if (paymentCancelled) {
        toast.info("Payment was cancelled. You can try again when you're ready.");
      }
      
      if (shouldClearParams) {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('payment_success');
          newParams.delete('payment_cancelled');
          newParams.delete('session_id');
          return newParams;
        });
      }
    };
    
    if (paymentSuccess || paymentCancelled) {
      handlePaymentResult();
    }
  }, [paymentSuccess, paymentCancelled, sessionId]);

  const handleToggleHideOlderThan90Days = (checked: boolean) => {
    setHideOlderThan90Days(checked);
  };

  const handleToggleHideLockedApplications = (checked: boolean) => {
    setHideLockedApplications(checked);
  };

  const handleToggleHidePurchasedApplications = (checked: boolean) => {
    setHidePurchasedApplications(checked);
  };
  
  const handleToggleAutoRefresh = (checked: boolean) => {
    setAutoRefresh(checked);
  };

  return (
    <DealerDashboardLayout
      availableApplications={
        <>
          <Card>
            <CardHeader>
              <CardTitle>Available Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="visible" value={activeApplicationTab} onValueChange={(value) => setActiveApplicationTab(value as 'visible' | 'hidden')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="visible" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Visible
                  </TabsTrigger>
                  <TabsTrigger value="hidden" className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Hidden ({hiddenApplications.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="visible">
                  <ApplicationOptions
                    hideOlderThan90Days={hideOlderThan90Days}
                    hideLockedApplications={hideLockedApplications}
                    hidePurchasedApplications={hidePurchasedApplications}
                    autoRefresh={autoRefresh}
                    onToggleHideOlderThan90Days={handleToggleHideOlderThan90Days}
                    onToggleHideLockedApplications={handleToggleHideLockedApplications}
                    onToggleHidePurchasedApplications={handleToggleHidePurchasedApplications}
                    onToggleAutoRefresh={handleToggleAutoRefresh}
                  />
                  <ApplicationTable
                    applications={applications}
                    isLoading={isLoading}
                    selectedApplications={selectedApplications}
                    toggleApplicationSelection={toggleApplicationSelection}
                    selectAll={handleSelectAll}
                    onLock={handleLockApplication}
                    onUnlock={handleUnlockApplication}
                    onDownload={handleDownload}
                    onViewDetails={handleViewDetails}
                    onHideApplication={handleHideApplication}
                    onPurchase={handlePurchase}
                    processingId={processingId}
                    lockOptions={lockOptions}
                    ageDiscountSettings={ageDiscountSettings}
                    showActions={false}
                    isHiddenView={false}
                  />
                  
                  <BulkActionsBar
                    selectedCount={selectedApplications.length}
                    onBulkDownload={handleBulkDownload}
                    onBulkLock={handleBulkLock}
                    onClearSelection={() => setSelectedApplications([])}
                    isProcessing={!!processingId}
                    selectedApplicationIds={selectedApplications}
                    unpurchasedCount={getUnpurchasedApplications().length}
                    totalPurchaseCost={calculateTotalPurchaseCost(getUnpurchasedApplications())}
                    onPurchaseSelected={handleBulkPurchase}
                    allDownloaded={areAllSelectedDownloaded()}
                    onBulkHide={handleBulkHide}
                  />
                </TabsContent>
                
                <TabsContent value="hidden">
                  {hiddenApplications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hidden applications. Applications you hide will appear here.
                    </div>
                  ) : (
                    <ApplicationTable
                      applications={hiddenApplications}
                      isLoading={false}
                      selectedApplications={[]}
                      toggleApplicationSelection={() => {}}
                      selectAll={() => {}}
                      onLock={handleLockApplication}
                      onUnlock={handleUnlockApplication}
                      onDownload={handleDownload}
                      onViewDetails={handleViewDetails}
                      onHideApplication={handleUnhideApplication}
                      onPurchase={handlePurchase}
                      processingId={processingId}
                      lockOptions={lockOptions}
                      ageDiscountSettings={ageDiscountSettings}
                      showActions={false}
                      isHiddenView={true}
                    />
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 text-sm text-gray-500">
                <p>
                  Note: You will be charged for each new application download. 
                  Previously downloaded applications can be accessed for free.
                  Applications that have been recently downloaded by other dealers 
                  will be available at a discounted rate.
                  {ageDiscountSettings.isEnabled && (
                    <> Applications older than {ageDiscountSettings.daysThreshold} days 
                    are discounted by {ageDiscountSettings.discountPercentage}%.</>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <ApplicationDetails
            application={detailsApplication as ApplicationItem}
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            isDownloaded={purchasedApplicationIds.includes(detailsApplication?.applicationId || '')}
            onDownload={handleDownload}
            onLock={handleLockApplication}
            onUnlock={handleUnlockApplication}
            isProcessing={processingId === detailsApplication?.applicationId}
            selectedApplicationIds={detailsApplication ? [detailsApplication.applicationId] : []}
            ageDiscountSettings={ageDiscountSettings}
          />
          
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                  {pendingAction?.type === 'download' 
                    ? `You're about to purchase ${pendingAction.applicationIds.length} application(s).`
                    : `You're about to lock ${pendingAction?.applicationIds.length} application(s).`
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-t border-b py-3">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    {pendingAction?.type === 'download' ? (
                      <span>${calculateTotalPurchaseCost(pendingAction.applicationIds).toFixed(2)}</span>
                    ) : (
                      <span>$0.00</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowPaymentDialog(false)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1"
                    variant="success"
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Your payment will be processed securely through Stripe
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      }
      downloadedApplications={
        <DownloadedApplications
          applications={Array.isArray(downloadedApps) ? downloadedApps : []}
          isLoading={isLoadingDownloaded}
          onDownload={handleDownload}
          onViewDetails={handleViewDetails}
        />
      }
      profile={<DealerProfile />}
      invoices={<DealerInvoices />}
    />
  );
};

export default DealerDashboard;
