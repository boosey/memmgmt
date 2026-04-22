// Claude Code's slug scheme:
//   "/foo/bar"           ->  "-foo-bar"
//   "C:\\Users\\boose"   ->  "C--Users-boose"
//   "/opt/my-tool"       ->  "-opt-my--tool"   (literal "-" doubled)

function isWindowsDriveSlug(slug: string): boolean {
  return /^[A-Za-z]--/.test(slug);
}

export function slugToPath(slug: string): string {
  if (isWindowsDriveSlug(slug)) {
    const drive = slug[0]!;
    const rest = slug.slice(3);
    const segments = decodeDashes(rest);
    return `${drive}:\\${segments.join("\\")}`;
  }
  if (slug.startsWith("-")) {
    const rest = slug.slice(1);
    const segments = decodeDashes(rest);
    return `/${segments.join("/")}`;
  }
  return decodeDashes(slug).join("/");
}

export function pathToSlug(abs: string): string {
  const winMatch = /^([A-Za-z]):[\\/](.*)$/.exec(abs);
  if (winMatch) {
    const drive = winMatch[1]!;
    const rest = winMatch[2]!;
    const segments = rest.split(/[\\/]/);
    return `${drive}--${encodeSegments(segments)}`;
  }
  if (abs.startsWith("/")) {
    const segments = abs.slice(1).split("/");
    return `-${encodeSegments(segments)}`;
  }
  return encodeSegments(abs.split(/[\\/]/));
}

function encodeSegments(segments: string[]): string {
  return segments.map((s) => s.replace(/-/g, "--")).join("-");
}

function decodeDashes(encoded: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < encoded.length; i++) {
    const c = encoded[i]!;
    if (c === "-") {
      if (encoded[i + 1] === "-") {
        cur += "-";
        i++;
      } else {
        out.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}
