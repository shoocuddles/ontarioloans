import { useState, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format, isValid, parseISO } from 'date-fns';
import { Search, Lock } from 'lucide-react';
import { DownloadedApplication, LockType } from '@/lib/types/dealer-dashboard';
import DownloadOptions from './application-table/DownloadOptions';
import BulkActionsBar from './BulkActionsBar';
import { lockApplication } from '@/lib/services/lock/lockService';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/lib/services/stripe/stripeService';

interface DownloadedApplicationsProps {
  applications: DownloadedApplication[];
  isLoading: boolean;
  onDownload: (applicationId: string) => Promise<void>;
  onViewDetails: (application: DownloadedApplication) => void;
}

const DownloadedApplications = ({
  applications,
  isLoading,
  onDownload,
}: DownloadedApplicationsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const filteredApplications = applications.filter(app => 
    app.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.email && app.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (app.city && app.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const safeFormatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      
      const date = parseISO(dateString);
      
      if (!isValid(date)) return 'Invalid date';
      
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const formatLockStatus = (application: DownloadedApplication) => {
    if (!application.lockInfo || !application.lockInfo.isLocked) {
      return 'Not locked';
    }

    if (application.lockInfo.lockType === 'permanent') {
      return 'Perm. Locked';
    }

    if (application.lockInfo.expiresAt) {
      try {
        const expiryDate = parseISO(application.lockInfo.expiresAt);
        if (isValid(expiryDate)) {
          if (expiryDate < new Date()) {
            return 'Lock expired';
          }
          return `Locked until ${format(expiryDate, 'MMM d, h:mm a')}`;
        }
      } catch (error) {
        console.error('Error formatting lock date:', error);
      }
    }
    
    return 'Locked';
  };

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(filteredApplications.map(app => app.applicationId));
    } else {
      setSelectedApplications([]);
    }
  };

  const scrollToTop = () => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBulkDownload = async () => {
    // No need to purchase as these applications are already purchased
    console.log(`Bulk downloading ${selectedApplications.length} applications`);
    // The download functionality is handled by the DownloadOptions component
  };

  // Handle bulk lock for purchased applications with Stripe payment
  const handleBulkLock = async (lockType: LockType) => {
    try {
      setIsProcessingAction(true);
      console.log(`Initiating payment for locking ${selectedApplications.length} applications with lock type: ${lockType}`);
      
      // Get the fee amount for this lock type from lockoutPeriods
      // This would typically come from your database via an API call
      let lockFee = 0;
      switch(lockType) {
        case '24hours':
          lockFee = 4.99;
          break;
        case '1week':
          lockFee = 9.99;
          break;
        case 'permanent':
          lockFee = 29.99;
          break;
        default:
          lockFee = 4.99;
      }
      
      const totalAmount = lockFee * selectedApplications.length;
      
      // Create Stripe checkout session for lock payment
      const { data: checkoutData, error } = await createCheckoutSession({
        applicationIds: selectedApplications,
        priceType: 'standard',
        lockType: lockType,
        lockFee: lockFee,
        isLockPayment: true
      });
      
      if (error) {
        toast.error(`Payment setup failed: ${error.message}`);
        setIsProcessingAction(false);
        return;
      }
      
      // Redirect to Stripe checkout
      if (checkoutData?.url) {
        // Store selected applications and lock type in session storage
        sessionStorage.setItem('pendingLockApplications', JSON.stringify(selectedApplications));
        sessionStorage.setItem('pendingLockType', lockType);
        
        // Redirect to Stripe
        window.location.href = checkoutData.url;
      } else {
        toast.error('Could not create payment session');
        setIsProcessingAction(false);
      }
    } catch (error) {
      toast.error('Error setting up lock payment');
      console.error('Error during bulk lock payment:', error);
      setIsProcessingAction(false);
    }
  };

  console.log("Downloaded applications to display:", applications);

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">Purchased Applications</CardTitle>
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search purchased applications..."
              className="pl-8 pr-4 py-2 w-full border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Vehicle Type</TableHead>
                <TableHead>Downloaded</TableHead>
                <TableHead>Lock Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-ontario-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading purchased applications...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {searchTerm ? 'No applications match your search' : 'No purchased applications yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications.map((application) => (
                  <TableRow key={application.id || application.applicationId}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(application.applicationId)}
                        onChange={() => toggleApplicationSelection(application.applicationId)}
                        className="w-4 h-4"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{application.fullName || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{application.phoneNumber || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{application.email || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{application.address || 'N/A'}</div>
                      <div className="text-sm">
                        {[application.city, application.province, application.postalCode]
                          .filter(Boolean)
                          .join(', ') || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{application.vehicleType || 'N/A'}</TableCell>
                    <TableCell>{safeFormatDate(application.downloadDate || application.purchaseDate)}</TableCell>
                    <TableCell>
                      <div className={`text-sm ${application.lockInfo?.isLocked ? 
                        (application.lockInfo.lockType === 'permanent' ? 'text-amber-600 font-semibold' : 'text-blue-600') : 
                        'text-gray-500'}`}>
                        {formatLockStatus(application)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <DownloadOptions 
                          applicationIds={[application.applicationId]}
                          isProcessing={false}
                          variant="success"
                          size="icon"
                          showIcon={true}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Add BulkActionsBar for purchased applications */}
        <BulkActionsBar
          selectedCount={selectedApplications.length}
          onBulkDownload={handleBulkDownload}
          onBulkLock={handleBulkLock}
          onClearSelection={() => setSelectedApplications([])}
          isProcessing={isProcessingAction}
          selectedApplicationIds={selectedApplications}
          unpurchasedCount={0} // All applications here are purchased
          totalPurchaseCost={0} // No cost for already purchased applications
          onPurchaseSelected={() => Promise.resolve()} // Not applicable
          allDownloaded={true} // All applications are already purchased/downloaded
        />
      </CardContent>
    </Card>
  );
};

export default DownloadedApplications;
