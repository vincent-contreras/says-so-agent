import { promises as fs } from "fs";
import path from "path";

export async function loadAgentDefinition(): Promise<string> {
  const agentPath = path.join(process.cwd(), "agents", "default", "AGENT.md");

  try {
    const content = await fs.readFile(agentPath, "utf-8");
    return content.trim();
  } catch (error) {
    console.error("Failed to load agent definition:", error);
    return "You are a sentiment analysis assistant that analyzes user sentiment for products and services using Twitter and Reddit data.";
  }
}

let cachedAgentDefinition: string | null = null;

export async function getAgentDefinition(): Promise<string> {
  if (cachedAgentDefinition === null) {
    cachedAgentDefinition = await loadAgentDefinition();
  }
  return cachedAgentDefinition;
}
