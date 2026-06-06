// Zip the contents of dist/ with forward-slash entry paths (required by Butterbase).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = fs.createWriteStream(path.join(__dirname, "frontend.zip"));
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => console.log(`frontend.zip created (${archive.pointer()} bytes)`));
archive.on("error", (err) => { throw err; });

archive.pipe(output);
archive.directory("dist/", false);
archive.finalize();
