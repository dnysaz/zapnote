"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[40vh] w-full items-center justify-center rounded-lg border border-(--crm-border) bg-white text-xs text-(--crm-muted)">
      Loading code editor…
    </div>
  ),
});

export function CodeEditor({
  value,
  language,
  onChange,
}: {
  value: string;
  language: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="h-full min-h-[40vh] w-full overflow-hidden rounded-lg border border-(--crm-border) bg-white">
      <MonacoEditor
        height="100%"
        theme="vs"
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          tabSize: 2,
          renderLineHighlight: "line",
        }}
      />
    </div>
  );
}
