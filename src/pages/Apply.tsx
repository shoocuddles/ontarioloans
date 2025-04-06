
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApplicationFormStep1 from "@/components/ApplicationFormStep1";
import ApplicationFormStep2 from "@/components/ApplicationFormStep2";
import ApplicationFormStep3 from "@/components/ApplicationFormStep3";
import ApplicationFormStep4 from "@/components/ApplicationFormStep4";
import { ApplicationForm } from "@/lib/types";
import { submitApplication } from "@/lib/supabase";

const initialFormState: ApplicationForm = {
  // Step 1: Personal Info
  fullName: "",
  phoneNumber: "",
  email: "",
  streetAddress: "",
  city: "",
  province: "Ontario",
  postalCode: "",
  
  // Step 2: Desired Vehicle
  vehicleType: "",
  requiredFeatures: "",
  unwantedColors: "",
  preferredMakeModel: "",
  
  // Step 3: Existing Car Loan
  hasExistingLoan: false,
  currentPayment: "",
  amountOwed: "",
  currentVehicle: "",
  mileage: "",
  
  // Step 4: Income Details
  employmentStatus: "",
  monthlyIncome: "",
  additionalNotes: ""
};

const Apply = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationForm>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load draft from localStorage if exists
  useEffect(() => {
    const savedDraft = localStorage.getItem('applicationDraft');
    const savedDraftId = localStorage.getItem('applicationDraftId');
    
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft));
    }
    
    if (savedDraftId) {
      setDraftId(savedDraftId);
    }
  }, []);

  const saveProgress = async (data: ApplicationForm, isComplete = false) => {
    try {
      // Reset any previous errors
      setError(null);
      setIsSavingProgress(true);
      
      // Save to localStorage as a backup first (this should always succeed)
      localStorage.setItem('applicationDraft', JSON.stringify(data));
      
      // Now attempt to save to the server
      try {
        // Convert the form data to the expected application structure
        const applicationData = {
          ...data,
          isComplete,
          status: isComplete ? 'submitted' : 'draft' // Set the status explicitly
        };
        
        console.log('Preparing to submit application data:', 
          isComplete ? 'FINAL SUBMISSION' : 'Draft save', 
          draftId ? `with ID: ${draftId}` : 'new application');
        
        // If we have a draft ID, update it; otherwise create a new one
        let result = null;
        if (draftId) {
          console.log('Updating existing draft with ID:', draftId);
          result = await submitApplication({ ...applicationData, id: draftId }, isComplete);
          console.log('Update application result:', result);
        } else {
          console.log('Creating new application', isComplete ? '(COMPLETE)' : '(draft)');
          result = await submitApplication(applicationData, isComplete);
          console.log('Create application result:', result);
        }
        
        // Save the draft ID if we get one back
        if (result && result.id && !draftId) {
          console.log('Setting draft ID:', result.id);
          setDraftId(result.id);
          localStorage.setItem('applicationDraftId', result.id);
        }
        
        setIsSavingProgress(false);
        
        if (isComplete) {
          console.log('Application marked as complete successfully');
        }
        
        return true;
      } catch (supabaseError) {
        console.error("Detailed Supabase error during save progress:", supabaseError);
        
        // Set detailed error message for debugging
        if (supabaseError instanceof Error) {
          setError(`Supabase error details: ${supabaseError.message}`);
        } else {
          setError(`Unknown Supabase error: ${JSON.stringify(supabaseError)}`);
        }
        
        // For non-final submissions, we can continue with localStorage backup
        if (!isComplete) {
          // Since we already saved to localStorage, we can continue without blocking
          toast({
            title: "Local Save Only",
            description: "Your progress has been saved locally. We'll try to sync with our servers later.",
            variant: "default",
          });
          
          // Return true to allow the user to continue
          setIsSavingProgress(false);
          return true;
        } else {
          // For final submission, we need to fail if the server save fails
          toast({
            title: "Submission Error",
            description: "There was a problem submitting your application to our servers.",
            variant: "destructive",
          });
          
          setIsSavingProgress(false);
          return false;
        }
      }
    } catch (error) {
      console.error("Detailed error saving application progress:", error);
      
      // Set detailed error message
      if (error instanceof Error) {
        setError(`Error details: ${error.message}`);
      } else {
        setError(`Unknown error: ${JSON.stringify(error)}`);
      }
      
      // If everything fails, show a toast but still allow progress for non-final submissions
      toast({
        title: "Warning",
        description: "We've encountered an issue saving your progress. You can continue, but please don't close your browser.",
        variant: "destructive",
      });
      
      setIsSavingProgress(false);
      // Return true to allow user to continue anyway for non-final submissions
      return !isComplete;
    }
  };

  const nextStep = () => {
    console.log("nextStep called, saving progress and advancing to step", currentStep + 1);
    
    // First, save to localStorage immediately to ensure we don't lose data
    localStorage.setItem('applicationDraft', JSON.stringify(formData));
    
    // Increment the step immediately to give user feedback
    setCurrentStep(currentStep + 1);
    window.scrollTo(0, 0);
    
    // Then attempt to save to server in the background
    saveProgress(formData)
      .catch(err => {
        console.error("Background save failed:", err);
        // We already advanced the step, so no need to handle this error further
      });
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo(0, 0);
  };

  const updateFormData = (data: Partial<ApplicationForm>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    try {
      console.log("Final submit called, marking application as complete");
      
      setIsSubmitting(true);
      setError(null);
      
      // First save to localStorage immediately
      localStorage.setItem('applicationDraft', JSON.stringify(formData));
      console.log("Saved to localStorage");
      
      try {
        // Final submission (mark as complete)
        console.log("Submitting to server with complete flag");
        const success = await saveProgress(formData, true);
        
        if (success) {
          console.log("Application submitted successfully");
          
          // Clear draft data
          localStorage.removeItem('applicationDraft');
          localStorage.removeItem('applicationDraftId');
          setDraftId(null);
          
          toast({
            title: "Application Submitted!",
            description: "Thank you for applying with Ontario Loans. We'll be in touch soon.",
            variant: "default",
          });
          
          // Redirect to homepage after a short delay to ensure the toast is visible
          console.log("Redirecting to home page in 1 second");
          setTimeout(() => {
            navigate("/");
          }, 1000);
        } else {
          console.error("Failed to submit application - saveProgress returned false");
          throw new Error("Failed to submit application to server");
        }
      } catch (submitError) {
        console.error("Error during final submission:", submitError);
        
        // Set detailed error message
        if (submitError instanceof Error) {
          setError(`Submission error details: ${submitError.message}`);
        } else {
          setError(`Unknown submission error: ${JSON.stringify(submitError)}`);
        }
        
        toast({
          title: "Submission Error",
          description: "There was a problem submitting your application. See details below.",
          variant: "destructive",
        });
        
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Unhandled error in handleSubmit:", error);
      
      // Set detailed error message
      if (error instanceof Error) {
        setError(`Error details: ${error.message}`);
      } else {
        setError(`Unknown error: ${JSON.stringify(error)}`);
      }
      
      toast({
        title: "Submission Error",
        description: "There was a problem submitting your application. See details below.",
        variant: "destructive",
      });
      
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ApplicationFormStep1
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
          />
        );
      case 2:
        return (
          <ApplicationFormStep2
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 3:
        return (
          <ApplicationFormStep3
            formData={formData}
            updateFormData={updateFormData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        );
      case 4:
        return (
          <ApplicationFormStep4
            formData={formData}
            updateFormData={updateFormData}
            prevStep={prevStep}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow py-12 bg-ontario-gray">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-center text-ontario-blue">Apply for Auto Financing</h1>
              <p className="text-center text-gray-600 mt-2">Complete the form below to get started</p>
              
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Submission Error</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap break-words">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              {draftId && (
                <div className="mt-4 px-4 py-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">
                    Your progress is being saved automatically. You can return to complete your application later.
                  </p>
                </div>
              )}
              
              {isSavingProgress && (
                <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    Saving your progress...
                  </p>
                </div>
              )}
              
              <div className="mt-8 flex justify-between items-center">
                {[1, 2, 3, 4].map((step) => (
                  <div 
                    key={step} 
                    className={`flex flex-col items-center ${step < currentStep ? 'text-ontario-blue' : step === currentStep ? 'text-ontario-blue font-bold' : 'text-gray-400'}`}
                  >
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                        step < currentStep 
                          ? 'bg-ontario-blue text-white' 
                          : step === currentStep 
                            ? 'bg-ontario-lightblue text-white' 
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step}
                    </div>
                    <div className="text-xs text-center hidden md:block">
                      {step === 1 && "Personal Info"}
                      {step === 2 && "Vehicle Details"}
                      {step === 3 && "Current Loan"}
                      {step === 4 && "Income"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {renderStep()}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Apply;
