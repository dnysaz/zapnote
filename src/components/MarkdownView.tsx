import { markdownToHtml } from "@/lib/markdown";

const PROSE_CLASSES = [
  "leading-7 text-(--crm-body)",
  "[&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-(--crm-fg) [&_h1]:first:mt-0",
  "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-(--crm-fg)",
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-(--crm-fg)",
  "[&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-(--crm-fg)",
  "[&_p]:my-3 [&_p]:first:mt-0 [&_p]:last:mb-0",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li]:my-1 [&_li]:pl-1",
  "[&_a]:font-medium [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-800",
  "[&_strong]:font-semibold [&_strong]:text-(--crm-fg)",
  "[&_em]:italic",
  "[&_code]:rounded [&_code]:bg-(--crm-hover) [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-medium",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-(--crm-border) [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-(--crm-secondary)",
  "[&_hr]:my-6 [&_hr]:border-(--crm-border-soft)",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_td]:border-b [&_td]:border-(--crm-border-soft) [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_th]:border-b-2 [&_th]:border-(--crm-border) [&_th]:bg-(--crm-hover) [&_th]:px-3 [&_th]:py-2 [&_th]:text-[0.85em] [&_th]:font-semibold [&_th]:text-(--crm-fg) [&_tbody>tr:last-child>td]:border-b-0",
].join(" ");

export function MarkdownView({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div
      className={`${PROSE_CLASSES}${className ? ` ${className}` : ""}`}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}
