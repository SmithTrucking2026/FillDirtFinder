import { useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/current-user";
import { Loader2, RotateCcw, Settings2 } from "lucide-react";

const settingsSchema = z.object({
  massGradeRate: z.coerce.number().min(0, "Must be positive"),
  regularRate: z.coerce.number().min(0, "Must be positive"),
  hourlyRate: z.coerce.number().min(0, "Must be positive"),
  externalMargin: z.coerce.number().min(0).max(100),
  intercoMargin: z.coerce.number().min(0).max(100),
  avgSpeedMph: z.coerce.number().min(5).max(80),
  loadBufferMinutes: z.coerce.number().min(0)
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const DEFAULT_SETTINGS: SettingsFormValues = {
  massGradeRate: 85,
  regularRate: 95,
  hourlyRate: 100,
  externalMargin: 20,
  intercoMargin: 15,
  avgSpeedMph: 35,
  loadBufferMinutes: 15,
};

export default function SettingsPage() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetSettings({ 
    query: { queryKey: getGetSettingsQueryKey() } 
  });
  
  const updateMutation = useUpdateSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULT_SETTINGS,
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        massGradeRate: settings.massGradeRate,
        regularRate: settings.regularRate,
        hourlyRate: settings.hourlyRate,
        externalMargin: settings.externalMargin * 100,
        intercoMargin: settings.intercoMargin * 100,
        avgSpeedMph: settings.avgSpeedMph,
        loadBufferMinutes: settings.loadBufferMinutes,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsFormValues) => {
    if (!currentUser) return;
    
    updateMutation.mutate({
      data: {
        massGradeRate: values.massGradeRate,
        regularRate: values.regularRate,
        hourlyRate: values.hourlyRate,
        externalMargin: values.externalMargin / 100,
        intercoMargin: values.intercoMargin / 100,
        avgSpeedMph: values.avgSpeedMph,
        loadBufferMinutes: values.loadBufferMinutes,
        updatedBy: currentUser,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Rates updated",
          description: "Every quote now uses these values."
        });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => {
        toast({
          title: "Error updating settings",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleReset = () => {
    form.reset(DEFAULT_SETTINGS);
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

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-primary" />
                Global Rates
              </h1>
              <p className="text-muted-foreground text-sm">Configure base parameters for all quotes.</p>
            </div>
            {settings && (
              <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm font-medium border border-primary/20">
                Last set by {settings.updatedBy} {formatDistanceToNow(new Date(settings.updatedAt), { addSuffix: true })}
              </div>
            )}
          </div>
          
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Hourly Rates</h3>
                    <FormField
                      control={form.control}
                      name="massGradeRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mass Grade Hourly Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="regularRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Regular Hourly Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hourly Rate ($/hr)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Margins</h3>
                    <FormField
                      control={form.control}
                      name="externalMargin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>External Margin (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="intercoMargin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interco Margin (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Drive Assumptions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="avgSpeedMph"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Avg Speed (MPH)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="loadBufferMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Load Buffer (minutes per round trip)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <Button type="button" variant="outline" onClick={handleReset} className="gap-2 text-muted-foreground">
                    <RotateCcw className="w-4 h-4" /> Reset to Defaults
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} className="min-w-[120px]">
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Rates
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
