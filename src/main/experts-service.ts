import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface Expert {
  id: string;
  name: string;
  description: string;
  mcpIds: string[];
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExpertsData {
  experts: Expert[];
}

function getExpertsPath(): string {
  return path.join(app.getPath('userData'), 'experts-config.json');
}

export function loadExperts(): ExpertsData {
  try {
    const raw = fs.readFileSync(getExpertsPath(), 'utf-8');
    const data = JSON.parse(raw) as ExpertsData;
    return {
      experts: Array.isArray(data.experts) ? data.experts : []
    };
  } catch {
    return { experts: [] };
  }
}

export function saveExperts(data: ExpertsData): void {
  const filePath = getExpertsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
