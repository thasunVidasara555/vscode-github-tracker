const vscode = require("vscode");
const fs = require("fs");
const exec = require("child_process").exec;
const { Octokit } = require("@octokit/rest");

let octokit;
let repoDir;

async function createRepo(repoName) {
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    private: false,
  });
  return data.clone_url;
}

async function setGitHubToken() {
  const token = await vscode.window.showInputBox({
    prompt: "Enter your GitHub token",
    ignoreFocusOut: true,
  });
  if (token) {
    octokit = new Octokit({ auth: token });
    vscode.workspace.getConfiguration().update('codeTracking.githubToken', token.toString(), true);
  }
}

async function setRepoDir() {
  const dir = await vscode.window.showInputBox({
    prompt: "Enter the directory to which the repository should be cloned",
    ignoreFocusOut: true,
  });
  if (dir) {
    repoDir = dir;
    vscode.workspace
      .getConfiguration()
      .update("codeTracking.repoDir", dir.toString(), true);
  }
}

function activate(context) {
  vscode.window.showInformationMessage("Code Tracking Extension Activated!");

  const config = vscode.workspace.getConfiguration("codeTracking");
  octokit = new Octokit({ auth: config.githubToken });
  repoDir = config.repoDir || `${require("os").homedir()}/github-tracker`;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeTracking.setGitHubToken",
      setGitHubToken
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.setRepoDir", setRepoDir)
  );

  setInterval(async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const gitDir = `${repoDir}/.git`;
    let repoUrl;
    if (!fs.existsSync(gitDir)) {
      repoUrl = await createRepo("github-tracker");
      exec(`git clone ${repoUrl} ${repoDir}`, (err, stdout, stderr) => {
        if (err) {
          console.error("Git clone error:", stderr);
          return;
        } else {
          console.log("Git clone success:", stdout);
        }
      });
    }

    exec(`git -C ${repoDir} status --porcelain`, (err, stdout, stderr) => {
      if (err) {
        console.error("Git status error:", stderr);
        return;
      }

      const modifiedFiles = stdout
        .split("\n")
        .filter((line) => line.startsWith("M"))
        .map((line) => line.substring(3));
      const logMessage = `Work session logged at ${new Date().toLocaleString()} in ${
        workspaceFolders[0].uri.fsPath
      }. This session lasted for 30   
minutes. Modified files: ${modifiedFiles.join(", ")}.`;
      const logFile = `${repoDir}/.code-tracking.log`;

      fs.appendFileSync(logFile, `${logMessage}\n`);
      exec(
        `git -C ${repoDir} add .code-tracking.log && git -C ${repoDir} commit -m "Auto log: ${logMessage}" && git -C ${repoDir} push`,
        (err, stdout, stderr) => {
          if (err) {
            console.error("Git commit error:", stderr);
          } else {
            console.log("Git commit success:", stdout);
          }
        }
      );
    });
  }, 0.5 * 60 * 1000); // 30 minutes interval
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
