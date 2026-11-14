import JSZip from "jszip";

export async function extractZipFiles(file: File): Promise<{ filename: string; content: string }[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const files: { filename: string; content: string }[] = [];

  for (const [filename, zipEntry] of Object.entries(loadedZip.files)) {
    if (!zipEntry.dir && !filename.startsWith("__MACOSX") && !filename.includes(".DS_Store")) {
      try {
        const text = await zipEntry.async("string");
        // Limit individual file size to ~200KB to prevent context blowup
        if (text.length < 200000) {
          files.push({ filename, content: text });
        }
      } catch {
        // Skip binary or unreadable files
      }
    }
  }

  return files;
}

export async function downloadFilesAsZip(
  files: { filename: string; content: string }[],
  zipFilename: string = "project.zip"
) {
  const zip = new JSZip();

  for (const f of files) {
    zip.file(f.filename, f.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
