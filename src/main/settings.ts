import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface AppSettings {
  llm: {
    baseUrl: string;
    apiKey: string;
    model: string;
  };
}

const defaultSettings: AppSettings = {
  llm: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini'
  }
};

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      llm: {
        ...defaultSettings.llm,
        ...parsed.llm
      }
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: AppSettings): void {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
}
