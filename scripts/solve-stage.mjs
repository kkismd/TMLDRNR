import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseMapText } from "../src/map-text.js";
import { stages } from "../src/stages.js";
import { GuardCadence } from "../src/core/step.js";
import { solveStage } from "../src/solver/solve-stage.js";

const CADENCES = new Set(Object.values(GuardCadence));

function parseArgs(args) {
  const options = { source: null, cadence: GuardCadence.EVERY_TURN, maxVisited: 100000, maxDepth: 50 };
  const seen = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const flag = args[i];
    if (seen.has(flag)) throw new Error(`Duplicate option: ${flag}`);
    seen.add(flag);
    if (["--stdin"].includes(flag)) {
      if (options.source) throw new Error("Choose exactly one input source.");
      options.source = { kind: "stdin", value: null };
    } else if (["--file", "--stage", "--cadence", "--max-visited", "--max-depth"].includes(flag)) {
      const value = args[++i];
      if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${flag}.`);
      if (flag === "--file" || flag === "--stage") {
        if (options.source) throw new Error("Choose exactly one input source.");
        options.source = { kind: flag === "--file" ? "file" : "catalog", value };
      } else if (flag === "--cadence") {
        if (!CADENCES.has(value)) throw new Error(`Unsupported cadence: ${value}`);
        options.cadence = value;
      } else {
        if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error(`${flag} must be an integer.`);
        const number = Number(value);
        const minimum = flag === "--max-depth" ? 0 : 1;
        if (!Number.isSafeInteger(number) || number < minimum) throw new Error(`${flag} is out of range.`);
        options[flag === "--max-depth" ? "maxDepth" : "maxVisited"] = number;
      }
    } else {
      throw new Error(`Unknown option: ${flag}`);
    }
  }
  if (!options.source) throw new Error("Choose one input source: --file, --stdin, or --stage.");
  return options;
}

function readStdin() {
  return (async () => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) chunks.push(chunk);
    return chunks.join("");
  })();
}

export async function runCli(args, io = {}) {
  const writeOut = io.writeOut ?? ((text) => process.stdout.write(text));
  const writeErr = io.writeErr ?? ((text) => process.stderr.write(text));
  const loadFile = io.readFile ?? ((path) => readFile(path, "utf8"));
  const loadStdin = io.readStdin ?? readStdin;
  let source = null;
  let stageId = null;
  let parseError = null;
  try {
    const options = parseArgs(args);
    source = options.source;
    let stage;
    if (source.kind === "catalog") {
      stage = stages.find((candidate) => candidate.id === source.value);
      if (!stage) throw new Error(`Unknown stage ID: ${source.value}`);
      stageId = source.value;
    } else {
      const text = source.kind === "file" ? await loadFile(source.value) : await loadStdin();
      const parsed = parseMapText(text);
      if (!parsed.ok) {
        parseError = parsed.error;
        throw new Error(`${parsed.error.code}: ${parsed.error.message}`);
      }
      stage = parsed.stage;
    }
    const result = solveStage(stage, { cadence: options.cadence, maxVisited: options.maxVisited,
      maxDepth: options.maxDepth });
    writeOut(`${JSON.stringify({ ...result, source, stageId, cadence: options.cadence })}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeErr(`${message}\n`);
    writeOut(`${JSON.stringify({ status: "error", source, stageId, message, parseError })}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
