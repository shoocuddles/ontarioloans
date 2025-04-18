
import { useState, ReactNode, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import DealerHeader from '@/components/DealerHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, User, Archive, FileText } from 'lucide-react';
import { setupEmailNotificationListener } from '@/lib/emailNotificationListener';

interface DealerDashboardLayoutProps {
  availableApplications: ReactNode;
  downloadedApplications: ReactNode;
  profile: ReactNode;
  invoices?: ReactNode;  // Invoice tab content
}

const DealerDashboardLayout = ({
  availableApplications,
  downloadedApplications,
  profile,
  invoices  // Keep invoice parameter
}: DealerDashboardLayoutProps) => {
  const [activeTab, setActiveTab] = useState("available");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Set up realtime notifications listener
  useEffect(() => {
    console.log("🔌 Setting up dealer dashboard notifications");
    const unsubscribe = setupEmailNotificationListener();
    return () => unsubscribe();
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pt-[75px]">
      <DealerHeader user={user} onSignOut={handleSignOut} />
      
      <div className="flex-grow container mx-auto py-6 px-4 md:px-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full bg-gray-100">
            <TabsTrigger value="available" className={cn(
              "flex items-center space-x-2 py-3",
              activeTab === "available" && "text-ontario-blue"
            )}>
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden md:inline">Available</span>
            </TabsTrigger>
            
            <TabsTrigger value="downloaded" className={cn(
              "flex items-center space-x-2 py-3",
              activeTab === "downloaded" && "text-ontario-blue"
            )}>
              <Archive className="h-4 w-4" />
              <span className="hidden md:inline">Purchased</span>
            </TabsTrigger>
            
            <TabsTrigger value="invoices" className={cn(
              "flex items-center space-x-2 py-3",
              activeTab === "invoices" && "text-ontario-blue" 
            )}>
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Invoices</span>
            </TabsTrigger>
            
            <TabsTrigger value="profile" className={cn(
              "flex items-center space-x-2 py-3",
              activeTab === "profile" && "text-ontario-blue"
            )}>
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="mt-6">
            {availableApplications}
          </TabsContent>
          
          <TabsContent value="downloaded" className="mt-6">
            {downloadedApplications}
          </TabsContent>
          
          <TabsContent value="invoices" className="mt-6">
            {invoices}
          </TabsContent>
          
          <TabsContent value="profile" className="mt-6">
            {profile}
          </TabsContent>
        </Tabs>
      </div>
      
      <footer className="py-4 px-6 bg-white border-t text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Auto Finance Ontario - Dealer Portal
      </footer>
    </div>
  );
};

export default DealerDashboardLayout;
