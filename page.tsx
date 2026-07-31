"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createCheckoutAction,
  deleteReportAction,
  generateReportAction,
  getDashboardAction,
  renameReportAction,
  type ActionResult,
} from "@/app/actions";
import { AccountPanel, HistoryPanel, ReportView } from "@/components/dashboard";
import { Logo } from "@/components/site";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@/components/ui";
import { supabase } from "@/lib/supabase-browser";
import type { Profile, ReportRow } from "@/lib/types";

/** Server actions return a result envelope; unwrap it into a throw for React Query. */
function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const upgradePlans = [
  { id: "starter", name: "Starter", price: "$29/mo", detail: "50 reports per month" },
  { id: "pro", name: "Pro", price: "$49/mo", detail: "150 reports per month" },
  { id: "agency", name: "Agency", price: "$79/mo", detail: "500 reports per month" },
];

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => unwrap(await getDashboardAction()),
  });

  const profile = dashboard.data?.profile as Profile | undefined;
  const reports = (dashboard.data?.reports ?? []) as ReportRow[];
  const activeReport = reports.find((row) => row.id === activeId) ?? reports[0] ?? null;

  useEffect(() => {
    if (!activeId && reports.length) setActiveId(reports[0].id);
  }, [activeId, reports]);

  const generate = useMutation({
    mutationFn: async (value: string) => unwrap(await generateReportAction(value)),
    onSuccess: (result) => {
      setUrl("");
      setActiveId(result.report.id);
      queryClient.setQueryData(["dashboard"], (previous: unknown) => {
        const prev = previous as { profile: Profile; reports: ReportRow[] } | undefined;
        if (!prev) return prev;
        return { profile: result.profile, reports: [result.report, ...prev.reports] };
      });
      toast.success("Brief ready");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rename = useMutation({
    mutationFn: async (input: { id: string; name: string }) =>
      unwrap(await renameReportAction(input.id, input.name)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Report renamed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => unwrap(await deleteReportAction(id)),
    onSuccess: (result) => {
      if (activeId === result.id) setActiveId(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Report deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const checkout = useMutation({
    mutationFn: async (plan: string) =>
      unwrap(await createCheckoutAction(plan, window.location.origin)),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  const remaining = profile ? Math.max(0, profile.reports_limit - profile.reports_used) : 0;
  const blocked = Boolean(profile) && remaining === 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocked) {
      setUpgradeOpen(true);
      return;
    }
    if (!url.trim()) return;
    generate.mutate(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {profile ? `${remaining} report${remaining === 1 ? "" : "s"} left` : ""}
            </span>
            {blocked ? (
              <Button size="sm" onClick={() => setUpgradeOpen(true)}>
                Upgrade
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-7rem)]">
          {dashboard.isLoading || !profile ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <AccountPanel
              profile={profile}
              onSignOut={signOut}
              onUpgrade={() => setUpgradeOpen(true)}
              upgrading={checkout.isPending}
            />
          )}

          <div className="surface-panel flex min-h-0 flex-1 flex-col rounded-xl p-4 lg:h-[calc(100%-19rem)]">
            <HistoryPanel
              reports={reports}
              loading={dashboard.isLoading}
              activeId={activeReport?.id ?? null}
              onSelect={(row) => setActiveId(row.id)}
              onRename={(row, name) => rename.mutate({ id: row.id, name })}
              onDelete={(row) => remove.mutate(row.id)}
            />
          </div>
        </aside>

        <section className="space-y-5">
          <div className="surface-panel rounded-xl p-5 sm:p-6">
            <h1 className="text-lg font-semibold">New prospect brief</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a prospect website. Orvexa audits the live page and writes the pitch.
            </p>

            <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://prospect-website.com"
                disabled={generate.isPending}
                className="h-11 flex-1"
                inputMode="url"
              />
              <Button
                type="submit"
                size="lg"
                disabled={generate.isPending || (!url.trim() && !blocked)}
                className="h-11 gap-2"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing…
                  </>
                ) : blocked ? (
                  <>
                    Upgrade to continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Generate report
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {blocked ? (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
                You&apos;ve used all {profile?.reports_limit} reports on the {profile?.plan} plan.
                Upgrade to keep generating briefs — your history stays available.
              </p>
            ) : null}

            {generate.isPending ? (
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Extracting the page, scoring it, then writing the outreach…</p>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ) : null}
          </div>

          {dashboard.isLoading ? (
            <Skeleton className="h-96 w-full rounded-xl" />
          ) : dashboard.isError ? (
            <div className="surface-panel rounded-xl p-10 text-center">
              <h2 className="text-base font-semibold">We couldn&apos;t load your workspace</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {(dashboard.error as Error).message}
              </p>
              <Button className="mt-5" variant="secondary" onClick={() => dashboard.refetch()}>
                Try again
              </Button>
            </div>
          ) : activeReport ? (
            <ReportView row={activeReport} />
          ) : (
            <div className="surface-panel rounded-xl p-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-border bg-surface">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-5 text-base font-semibold">No briefs yet</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Paste your first prospect URL above. You have {remaining} free report
                {remaining === 1 ? "" : "s"} to try it on real pipeline.
              </p>
            </div>
          )}
        </section>
      </main>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Orvexa</DialogTitle>
            <DialogDescription>
              Keep generating briefs. Cancel anytime from the Polar customer portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {upgradePlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={checkout.isPending}
                onClick={() => checkout.mutate(plan.id)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-surface/60 p-4 text-left transition-colors hover:border-primary/40 disabled:opacity-60"
              >
                <span>
                  <span className="block text-sm font-semibold">{plan.name}</span>
                  <span className="block text-xs text-muted-foreground">{plan.detail}</span>
                </span>
                <span className="text-sm font-medium">{plan.price}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
