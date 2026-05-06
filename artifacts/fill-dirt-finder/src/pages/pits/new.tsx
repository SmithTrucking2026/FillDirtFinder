import { useLocation } from "wouter";
import { useCreatePit, getListPitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PitForm, PitFormValues } from "@/components/pit-form";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function NewPit() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreatePit();

  const handleSubmit = (values: PitFormValues) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Pit Created", description: `${values.name} has been added successfully.` });
        queryClient.invalidateQueries({ queryKey: getListPitsQueryKey() });
        setLocation("/pits");
      },
      onError: () => {
        toast({ 
          title: "Error creating pit", 
          description: "There was a problem saving this pit. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <Link href="/pits" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mb-6 font-medium text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
        
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4">
            <h1 className="text-2xl font-bold">Add New Borrow Pit</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter pricing and location details for the new pit.</p>
          </div>
          <div className="p-6">
            <PitForm 
              onSubmit={handleSubmit} 
              isSubmitting={createMutation.isPending} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
