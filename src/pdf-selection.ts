export function resolveSelectedPdfPath(
  file: Pick<File, "name"> & { path?: string },
  electronPathResolver: (file: File) => string | undefined
): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return null;
  }
  const path = file.path ?? electronPathResolver(file as File);
  return typeof path === "string" && path ? path : null;
}
