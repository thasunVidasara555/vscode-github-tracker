const vscode = require("vscode");
const CodeTracker = require("./src/tracker");
const log = require("./src/logger"); // Import logger

function activate(context) {
  log.info("Code Tracking Extension Activated!");

  const tracker = new CodeTracker(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.setGitHubToken", () =>
      tracker.setGitHubToken(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.setGitHubUsername", () =>
      tracker.setGitHubUsername(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.setRepoDir", () =>
      tracker.checkAndSetupRepo(),
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.enable", async () => {
      try {
        await tracker.initialize();
        tracker.startLogging();
        vscode.window.showInformationMessage("Code Tracking Enabled");
      } catch (e) {
        vscode.window.showErrorMessage(e.message);
      }
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.disable", () => {
      tracker.stopLogging();
      vscode.window.showInformationMessage("Code Tracking Disabled");
    }),
  );

  tracker
    .initialize()
    .then(() => {
      tracker.startLogging();
    })
    .catch((e) => {
      vscode.window.showErrorMessage(e.message);
    });
}

function deactivate() {
  log.info("Code Tracking Extension Deactivated!");
}

module.exports = {
  activate,
  deactivate,
};
