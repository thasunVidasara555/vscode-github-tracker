const vscode = require("vscode");

class Config {
  constructor(workspace) {
    this.workspace = workspace;
  }

  get(key) {
    return this.workspace.getConfiguration("codeTracking").get(key);
  }

  update(key, value, target = vscode.ConfigurationTarget.Global) {
    // Default target
    return this.workspace
      .getConfiguration()
      .update("codeTracking." + key, value, target);
  }
}

module.exports = Config;
