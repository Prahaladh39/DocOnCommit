import fs from "fs";
import yaml from "js-yaml";

export interface DocSyncConfig {
  update_readme: boolean;
  generate_diagram: boolean;
  diagram_trigger: "commit_message";

  docstrings: {
    enabled: boolean;
    mode: "suggest" | "auto";
  };
}

const DEFAULT_CONFIG: DocSyncConfig = {
  update_readme: true,
  generate_diagram: false,
  diagram_trigger: "commit_message",

  docstrings: {
    enabled: true,
    mode: "suggest",
  },
};

export function loadConfig(): DocSyncConfig {
  try {
    if (!fs.existsSync(".docsync.yml")) {
      return DEFAULT_CONFIG;
    }

    const file = fs.readFileSync(".docsync.yml", "utf8");
    const parsed: any = yaml.load(file);

    return {
      ...DEFAULT_CONFIG,
      ...parsed?.docsync,
      docstrings: {
        ...DEFAULT_CONFIG.docstrings,
        ...parsed?.docsync?.docstrings,
      },
    };
  } catch (err) {
    console.error("Failed to load .docsync.yml, using defaults");
    return DEFAULT_CONFIG;
  }
}
