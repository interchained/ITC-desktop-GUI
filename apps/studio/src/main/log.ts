import fs from "node:fs";
import path from "node:path";

export function appendLog(filePath: string, line: string) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${new Date().toISOString()} ${line}\n`, {
      encoding: "utf8",
    });
  } catch {
    // ignore logging failures
  }
}
