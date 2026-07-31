"use client";

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  LogOut,
  Pencil,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button, Input, Skeleton } from "@/components/ui";
import { exportReportPdf } from "@/lib/pdf";
import {
  faviconFor,
  hostnameOf,
  reportTitle,
  toReport,
  type Profile,
  type ReportRow,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* ------------------------------- ScoreDial -------------------------------- */

export function ScoreDial({ label, value, hint }: { label: string; value: number; hint: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone =
    clamped >= 70 ? "var(--success)" : clamped >= 40 ? "var(--warning)" : "var(--destructive)";

  return (
    <div className="surface-panel flex items-center gap-4 rounded-xl p-4">
      <div
        className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${tone} ${clamped * 3.6}deg, var(--muted) 0deg)` }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-card">
          <span className="font-display text-lg font-semibold">{clamped}</span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/* ------------------------------- CopyButton ------------------------------- */

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Your browser blocked clipboard access.");
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={copy}
      disabled={!value}
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/* ------------------------------ AccountPanel ------------------------------ */

export function AccountPanel({
  profile,
  onSignOut,
  onUpgrade,
  upgrading,
}: {
  profile: Profile;
  onSignOut: () => void;
  onUpgrade: () => void;
  upgrading: boolean;
}) {
  const remaining = Math.max(0, profile.reports_limit - profile.reports_used);
  const pct = profile.reports_limit
    ? Math.min(100, (profile.reports_used / profile.reports_limit) * 100)
    : 0;
  const exhausted = remaining === 0;

  return (
    <div className="surface-panel rounded-xl p-5">
      <div className="flex items-center gap-3">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-10 w-10 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-sm font-semibold">
            {(profile.full_name ?? profile.email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{profile.full_name ?? "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {profile.plan} plan
          </span>
          <span className="text-xs text-muted-foreground">
            {profile.reports_used}/{profile.reports_limit}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: exhausted ? "var(--destructive)" : "var(--gradient-primary)",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {exhausted
            ? "No reports left on this plan."
            : `${remaining} report${remaining === 1 ? "" : "s"} remaining`}
        </p>
      </div>

      <Button
        onClick={onUpgrade}
        disabled={upgrading}
        variant={exhausted ? "default" : "secondary"}
        className="mt-5 w-full"
      >
        {upgrading ? "Opening checkout…" : exhausted ? "Upgrade to keep going" : "Upgrade plan"}
      </Button>

      <Button
        onClick={onSignOut}
        variant="ghost"
        className="mt-2 w-full gap-2 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </div>
  );
}

/* ------------------------------ HistoryPanel ------------------------------ */

export function HistoryPanel({
  reports,
  loading,
  activeId,
  onSelect,
  onRename,
  onDelete,
}: {
  reports: ReportRow[];
  loading: boolean;
  activeId: string | null;
  onSelect: (row: ReportRow) => void;
  onRename: (row: ReportRow, name: string) => void;
  onDelete: (row: ReportRow) => void;
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(
      (row) =>
        reportTitle(row).toLowerCase().includes(q) || row.prospect_url.toLowerCase().includes(q),
    );
  }, [reports, query]);

  const startEdit = (row: ReportRow) => {
    setEditingId(row.id);
    setDraft(reportTitle(row));
  };

  const commit = (row: ReportRow) => {
    const name = draft.trim();
    setEditingId(null);
    if (name && name !== reportTitle(row)) onRename(row, name);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          History
        </h2>
        <span className="text-xs text-muted-foreground">{reports.length}</span>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search company or URL"
          className="h-9 pl-9"
        />
      </div>

      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          [0, 1, 2].map((index) => <Skeleton key={index} className="h-[68px] w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {reports.length === 0
              ? "Your generated briefs will appear here."
              : "No reports match that search."}
          </p>
        ) : (
          filtered.map((row) => {
            const active = row.id === activeId;
            return (
              <div
                key={row.id}
                className={cn(
                  "group rounded-lg border p-3 transition-colors duration-150",
                  active
                    ? "border-primary/45 bg-primary/5"
                    : "border-border bg-surface/50 hover:border-border-strong",
                )}
              >
                {editingId === row.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commit(row);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="h-8"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => commit(row)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={faviconFor(row.prospect_url)}
                        alt=""
                        loading="lazy"
                        className="mt-0.5 h-7 w-7 shrink-0 rounded border border-border bg-background p-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{reportTitle(row)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {hostnameOf(row.prospect_url)}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded border border-border px-1.5 py-0.5">
                            SEO {row.seo_score ?? "—"}
                          </span>
                          <span className="rounded border border-border px-1.5 py-0.5">
                            Lead {row.lead_score ?? "—"}
                          </span>
                          <span>{new Date(row.created_at).toLocaleDateString()}</span>
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label="Rename report"
                        onClick={() => startEdit(row)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label="Delete report"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------- ReportView ------------------------------- */

const severityTone: Record<string, string> = {
  critical: "border-destructive/40 text-destructive",
  high: "border-warning/40 text-warning",
  medium: "border-border-strong text-muted-foreground",
  low: "border-border text-muted-foreground",
};

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof Zap;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="surface-panel rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ReportView({ row }: { row: ReportRow }) {
  const report = toReport(row);
  const email = report.cold_email;

  return (
    <div className="space-y-4">
      <div className="surface-panel rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faviconFor(row.prospect_url)}
              alt=""
              className="mt-0.5 h-9 w-9 rounded-md border border-border bg-surface p-1"
              loading="lazy"
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{report.prospect_name}</h2>
              <a
                href={row.prospect_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {hostnameOf(row.prospect_url)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => exportReportPdf(row)}>
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {report.summary ? (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ScoreDial label="SEO score" value={report.seo_score} hint="On-page and technical health" />
          <ScoreDial label="Lead score" value={report.lead_score} hint="Fit as an agency prospect" />
        </div>
      </div>

      {report.biggest_issues.length ? (
        <Section title="Biggest issues" icon={ShieldAlert}>
          <ul className="space-y-3">
            {report.biggest_issues.map((issue, index) => (
              <li
                key={`${issue.title}-${index}`}
                className="rounded-lg border border-border bg-background/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">{issue.title}</h4>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                      severityTone[issue.severity] ?? severityTone.low
                    }`}
                  >
                    {issue.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="text-foreground/70">Evidence: </span>
                  {issue.evidence}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  <span className="text-foreground/70">Impact: </span>
                  {issue.business_impact}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {report.quick_wins.length ? (
        <Section title="Quick wins" icon={Zap}>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.quick_wins.map((win, index) => (
              <div
                key={`${win.title}-${index}`}
                className="rounded-lg border border-border bg-background/40 p-4"
              >
                <h4 className="text-sm font-semibold">{win.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{win.action}</p>
                <div className="mt-3 flex gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5">
                    effort {win.effort}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5">
                    impact {win.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {report.priority_fixes.length ? (
        <Section title="Priority fixes" icon={Sparkles}>
          <ol className="space-y-3">
            {report.priority_fixes.map((fix, index) => (
              <li key={`${fix.title}-${index}`} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border font-mono text-xs text-primary">
                  {index + 1}
                </span>
                <div>
                  <h4 className="text-sm font-semibold">{fix.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{fix.why}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                    Owner: {fix.owner}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {report.sales_angle ? (
        <Section title="Sales angle" icon={Sparkles} action={<CopyButton value={report.sales_angle} />}>
          <p className="text-sm leading-relaxed text-muted-foreground">{report.sales_angle}</p>
        </Section>
      ) : null}

      <Section
        title="Cold email"
        icon={Sparkles}
        action={<CopyButton value={`Subject: ${email.subject}\n\n${email.body}`} label="Copy email" />}
      >
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Subject</div>
          <p className="mt-1 text-sm font-medium">{email.subject}</p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {email.body}
          </p>
        </div>
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="LinkedIn DM" icon={Sparkles} action={<CopyButton value={report.linkedin_message} />}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {report.linkedin_message}
          </p>
        </Section>
        <Section title="Follow-up" icon={Sparkles} action={<CopyButton value={report.follow_up} />}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {report.follow_up}
          </p>
        </Section>
      </div>
    </div>
  );
}
