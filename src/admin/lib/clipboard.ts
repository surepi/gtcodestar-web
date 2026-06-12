export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for non-HTTPS, denied permissions, or older browser behavior.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const legacyCopy = (document as unknown as { execCommand(command: string): boolean }).execCommand;
    const copied = legacyCopy.call(document, "copy");
    if (!copied) throw new Error("copy command failed");
  } finally {
    document.body.removeChild(textarea);
  }
}
