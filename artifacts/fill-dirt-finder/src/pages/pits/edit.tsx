import { useLocation, useParams } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  useGetPit, 
  useUpdatePit, 
  useDeletePit,
  getGetPitQueryKey,
  getListPitsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PitForm, PitFormValues } from "@/components/pit-form";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function EditPit() {
  const params = useParams();
  const id = params.id!;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: pit, isLoading } = useGetPit(id, { 
    query: { enabled: !!id, queryKey: getGetPitQueryKey(id) } 
  });
  
  const updateMutation = useUpdatePit();
  const deleteMutation = useDeletePit();

  const handleSubmit = (values: PitFormValues) => {
    updateMutation.mutate({ id, data: values }, {
      onSuccess: () => {
        toast({ title: "Pricing Updated", description: `${values.name} has been updated.` });
        queryClient.invalidateQueries({ queryKey: getGetPitQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPitsQueryKey() });
        setLocation("/pits");
      },
      onError: () => {
        toast({ 
          title: "Error updating pit", 
          description: "There was a problem saving changes. Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Pit Deleted", description: `The pit has been removed.` });
        queryClient.invalidateQueries({ queryKey: getListPitsQueryKey() });
        setLocation("/pits");
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!pit) {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <h2 className="text-2xl font-bold">Pit not found</h2>
          <Button onClick={() => setLocation("/pits")}>Return to Directory</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <Link href="/pits" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mb-6 font-medium text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
        
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Edit Pricing: {pit.name}</h1>
              <p className="text-muted-foreground text-sm mt-1 font-medium bg-primary/10 text-primary px-2 py-1 inline-block rounded mt-2">
                Last updated by {pit.updatedBy} {formatDistanceToNow(new Date(pit.updatedAt), { addSuffix: true })}
              </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {pit.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. It will remove this pit from the active directory.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className="p-6">
            <PitForm 
              defaultValues={pit}
              onSubmit={handleSubmit} 
              isSubmitting={updateMutation.isPending} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
