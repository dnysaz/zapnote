"use client";

import { useMemo, useState } from "react";
import { CodeWorkspace, type ExplorerItem } from "@/components/CodeWorkspace";
import { useNotes } from "@/components/UnifiedNotesProvider";
import {
  type CodeFile,
  parseCodeFiles,
  serializeCodeFiles,
  isFolderNote,
  parentIdOf,
  uid,
} from "@/lib/crm";
import { codeLangForExt } from "@/components/EditorToolbar";

type EditorInit = {
  mode: "file" | "folder";
  noteId?: string;
  folderId?: string;
};

function readInit(): EditorInit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("zapnote:open-file");
    if (raw) {
      sessionStorage.removeItem("zapnote:open-file");
      return JSON.parse(raw) as EditorInit;
    }
  } catch {}
  return null;
}

function loadFiles(notes: ReturnType<typeof useNotes>["notes"], init: EditorInit) {
  let files: CodeFile[] = [];
  let tabs: { noteId: string; name: string; language: string }[] = [];
  let folderId: string | null = null;

  if (init.mode === "folder" && init.folderId) {
    const folder = notes.find((n) => n.id === init.folderId);
    if (!folder) return { files, tabs, folderId };
    folderId = parentIdOf(folder);

    const children = notes.filter(
      (n) => !isFolderNote(n) && parentIdOf(n) === init.folderId
    );
    children.forEach((note) => {
      const parsed = parseCodeFiles(note.content);
      if (parsed && parsed.length > 0) {
        const f = parsed[0];
        files.push(f);
        tabs.push({ noteId: note.id, name: f.name, language: f.language });
      }
    });
  } else if (init.mode === "file" && init.noteId) {
    const note = notes.find((n) => n.id === init.noteId);
    if (!note) return { files, tabs, folderId };
    folderId = parentIdOf(note);

    const parsed = parseCodeFiles(note.content);
    if (parsed && parsed.length > 0) {
      const f = parsed[0];
      files = [f];
      tabs = [{ noteId: note.id, name: f.name, language: f.language }];
    }
  }

  return { files, tabs, folderId };
}

function EditorInner({ init }: { init: EditorInit }) {
  const { notes, addNote, updateNote, deleteNote } = useNotes();

  const initial = useMemo(() => loadFiles(notes, init), [notes, init]);

  const [files, setFiles] = useState<CodeFile[]>(initial.files);
  const [openTabs, setOpenTabs] = useState(initial.tabs);
  const [activeFile, setActiveFile] = useState(0);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initial.tabs[0]?.noteId ?? null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initial.folderId);

  const explorerItems: ExplorerItem[] = useMemo(() => {
    const items: ExplorerItem[] = [];
    const buildFolder = (parentId: string | null, depth: number) => {
      notes
        .filter((n) => isFolderNote(n) && parentIdOf(n) === parentId)
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach((folder) => {
          const indent = "  ".repeat(depth);
          items.push({ noteId: folder.id, name: `${indent}${folder.title || "Untitled"}`, language: "folder" });
          notes
            .filter((n) => !isFolderNote(n) && n.kind === "code" && parentIdOf(n) === folder.id)
            .sort((a, b) => a.title.localeCompare(b.title))
            .forEach((n) => {
              const f = parseCodeFiles(n.content)?.[0];
              items.push({ noteId: n.id, name: `${indent}  ${f?.name ?? n.title ?? "untitled"}`, language: f?.language ?? "plaintext" });
            });
          buildFolder(folder.id, depth + 1);
        });
    };
    notes
      .filter((n) => !isFolderNote(n) && n.kind === "code" && parentIdOf(n) === null)
      .sort((a, b) => a.title.localeCompare(b.title))
      .forEach((n) => {
        const f = parseCodeFiles(n.content)?.[0];
        items.push({ noteId: n.id, name: f?.name ?? n.title ?? "untitled", language: f?.language ?? "plaintext" });
      });
    buildFolder(null, 0);
    return items;
  }, [notes]);

  function handleChange(value: string) {
    setFiles((prev) => {
      const next = [...prev];
      next[activeFile] = { ...next[activeFile], content: value };
      return next;
    });
    if (activeNoteId) {
      const note = notes.find((n) => n.id === activeNoteId);
      if (note) {
        const updated = files.map((f, i) => (i === activeFile ? { ...f, content: value } : f));
        updateNote({ ...note, content: serializeCodeFiles(updated), updatedAt: new Date().toISOString() });
      }
    }
  }

  function handleSelectFile(noteId: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note || isFolderNote(note)) return;
    const parsed = parseCodeFiles(note.content);
    if (!parsed || parsed.length === 0) return;
    const f = parsed[0];

    const existingIdx = files.findIndex((_, i) => openTabs[i]?.noteId === noteId);
    if (existingIdx >= 0) {
      setActiveFile(existingIdx);
      setActiveNoteId(noteId);
      return;
    }

    setFiles((prev) => [...prev, f]);
    setOpenTabs((prev) => [...prev, { noteId, name: f.name, language: f.language }]);
    setActiveFile(files.length);
    setActiveNoteId(noteId);
  }

  function handleCloseTab(noteId: string) {
    const idx = openTabs.findIndex((t) => t.noteId === noteId);
    if (idx < 0) return;
    const nextTabs = openTabs.filter((t) => t.noteId !== noteId);
    const nextFiles = files.filter((_, i) => i !== idx);
    setOpenTabs(nextTabs);
    setFiles(nextFiles);
    if (activeNoteId === noteId) {
      if (nextFiles.length === 0) {
        setActiveFile(0);
        setActiveNoteId(null);
      } else {
        const newIdx = Math.min(idx, nextFiles.length - 1);
        setActiveFile(newIdx);
        setActiveNoteId(nextTabs[newIdx]?.noteId ?? null);
      }
    }
  }

  function handleAddFile() {
    const name = "untitled";
    const language = "plaintext";
    const seed: CodeFile[] = [{ name, language, content: "" }];
    const now = new Date().toISOString();
    const id = uid();
    addNote({ id, title: name, content: serializeCodeFiles(seed), kind: "code", language, createdAt: now, updatedAt: now });
    setFiles((prev) => [...prev, seed[0]]);
    setOpenTabs((prev) => [...prev, { noteId: id, name, language }]);
    setActiveFile(files.length);
    setActiveNoteId(id);
  }

  function handleRename(noteId: string, name: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const ext = name.includes(".") ? name.split(".").pop()! : "";
    const language = codeLangForExt(ext);
    setOpenTabs((prev) => prev.map((t) => (t.noteId === noteId ? { ...t, name, language } : t)));
    setFiles((prev) => prev.map((f, i) => (openTabs[i]?.noteId === noteId ? { ...f, name, language } : f)));
    const parsed = parseCodeFiles(note.content);
    if (parsed && parsed.length > 0) {
      const updated = parsed.map((f, i) => (i === 0 ? { ...f, name, language } : f));
      updateNote({ ...note, title: name, content: serializeCodeFiles(updated), kind: "code", language, updatedAt: new Date().toISOString() });
    }
  }

  function handleDuplicate(noteId: string) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const parsed = parseCodeFiles(note.content);
    if (!parsed || parsed.length === 0) return;
    const f = parsed[0];
    const newName = f.name.replace(/(\.[^.]+)?$/, "-copy$1");
    const language = f.language;
    const seed: CodeFile[] = [{ name: newName, language, content: f.content }];
    const now = new Date().toISOString();
    const id = uid();
    addNote({ id, title: newName, content: serializeCodeFiles(seed), kind: "code", language, createdAt: now, updatedAt: now });
    setFiles((prev) => [...prev, seed[0]]);
    setOpenTabs((prev) => [...prev, { noteId: id, name: newName, language }]);
    setActiveFile(files.length);
    setActiveNoteId(id);
  }

  function handleDelete(noteId: string) {
    deleteNote(noteId);
    const idx = openTabs.findIndex((t) => t.noteId === noteId);
    if (idx < 0) return;
    const nextTabs = openTabs.filter((t) => t.noteId !== noteId);
    const nextFiles = files.filter((_, i) => i !== idx);
    setOpenTabs(nextTabs);
    setFiles(nextFiles);
    if (activeNoteId === noteId) {
      if (nextFiles.length === 0) {
        setActiveFile(0);
        setActiveNoteId(null);
      } else {
        const newIdx = Math.min(idx, nextFiles.length - 1);
        setActiveFile(newIdx);
        setActiveNoteId(nextTabs[newIdx]?.noteId ?? null);
      }
    }
  }

  function handleSetLanguage(language: string) {
    setFiles((prev) => prev.map((f, i) => (i === activeFile ? { ...f, language } : f)));
    if (activeNoteId) {
      const note = notes.find((n) => n.id === activeNoteId);
      if (note) {
        const updated = files.map((f, i) => (i === activeFile ? { ...f, language } : f));
        updateNote({ ...note, content: serializeCodeFiles(updated), kind: "code", language, updatedAt: new Date().toISOString() });
      }
    }
  }

  function handleSelectFolder(folderId: string) {
    setCurrentFolderId(folderId);
  }

  function handleNavigateUp() {
    if (!currentFolderId) return;
    const current = notes.find((n) => n.id === currentFolderId);
    setCurrentFolderId(current ? parentIdOf(current) : null);
  }

  const currentFolderName = (() => {
    if (!currentFolderId) return "";
    const f = notes.find((n) => n.id === currentFolderId);
    return f ? f.title || "Untitled" : "";
  })();

  return (
    <CodeWorkspace
      files={files}
      activeFile={activeFile}
      onChange={handleChange}
      onAddFile={handleAddFile}
      explorerItems={explorerItems}
      openTabs={openTabs}
      activeNoteId={activeNoteId}
      onSelectFile={handleSelectFile}
      onCloseTab={handleCloseTab}
      onRenameNote={handleRename}
      onDuplicateNote={handleDuplicate}
      onDeleteNote={handleDelete}
      onSetLanguage={handleSetLanguage}
      onBack={() => window.history.back()}
      onFullscreen={() => {}}
      onSelectFolder={handleSelectFolder}
      onNavigateUp={currentFolderId ? handleNavigateUp : undefined}
      currentFolderName={currentFolderName || "Workspace"}
      hasActiveNote={!!activeNoteId}
      isGuest={false}
    />
  );
}

export default function CodeEditorPage() {
  const [init] = useState<EditorInit | null>(() => readInit());

  if (!init) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#1e1e1e] text-[#cccccc]">
        <p className="text-sm">No file selected. Go back to the explorer.</p>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-[#1e1e1e]">
      <EditorInner key={init.noteId ?? init.folderId ?? "editor"} init={init} />
    </div>
  );
}
