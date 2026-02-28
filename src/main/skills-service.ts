import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface SkillsData {
  skills: Skill[];
}

function getSkillsPath(): string {
  return path.join(app.getPath('userData'), 'skills-config.json');
}

export function loadSkills(): SkillsData {
  try {
    const raw = fs.readFileSync(getSkillsPath(), 'utf-8');
    const data = JSON.parse(raw) as SkillsData;
    return {
      skills: Array.isArray(data.skills) ? data.skills : []
    };
  } catch {
    return { skills: [] };
  }
}

export function saveSkills(data: SkillsData): void {
  const filePath = getSkillsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
