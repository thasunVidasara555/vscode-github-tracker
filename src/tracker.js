const vscode = require("vscode");
const Config = require("./config");
const GitHub = require("./github");
const GitRepo = require("./git-repo");
const fs = require("fs");
const log = require("./logger");
const path = require('path');
const os = require('os');
const simpleGit = require('simple-git');

class CodeTracker {
  constructor(context) {
    this.context = context;
    this.config = new Config(vscode.workspace);
    this.github = null;
    this.repo = null;
    this.interval = null;
    this.tempLogDir = path.join(os.tmpdir(), 'code-tracking-temp'); // Temp dir
    fs.mkdirSync(this.tempLogDir, { recursive: true }); // Ensure it exists
}

  async initialize() {
    try {
      await this.setGitHubUsername();
      await this.setGitHubToken();
      await this.initializeOctokit();
      await this.checkAndSetupRepo();
    } catch (error) {
      log.error("Initialization failed:", error);
      vscode.window.showErrorMessage(
        "Code Tracking initialization failed. See logs for details.",
      );
    }
  }

  async setGitHubToken() {
    let githubToken = this.config.get("githubToken");

    if (!githubToken) {
      const token = await vscode.window.showInputBox({
        prompt: "Enter your GitHub token",
        ignoreFocusOut: true,
      });

      if (token) {
        await this.config.update("githubToken", token.toString());
        githubToken = token; // Update local variable
      } else {
        throw new Error("No token provided");
      }
    }
    return githubToken;
  }

  async setGitHubUsername() {
    let githubUsername = this.config.get("githubUsername");

    if (!githubUsername) {
      const username = await vscode.window.showInputBox({
        prompt: "Enter your GitHub username",
        ignoreFocusOut: true,
      });

      if (username) {
        await this.config.update("githubUsername", username.toString());
        githubUsername = username; // Update local variable
      } else {
        throw new Error("No username provided");
      }
    }
    return githubUsername;
  }

  async initializeOctokit() {
    const token = this.config.get("githubToken");
    const username = this.config.get("githubUsername");
    if (token && username) {
      this.github = new GitHub(token, username);
    } else {
      throw new Error("Token or username not set");
    }
  }

  async checkAndSetupRepo() {
    const repoName = "github-tracker";
    const repoDir = this.config.get("repoDir") || path.join(os.homedir(), repoName);
    this.repo = new GitRepo(repoDir);

    if (!this.github) {
        throw new Error("Github not initialized");
    }

    try {
        if (!await this.github.repoExists(repoName)) {
            const cloneUrl = await this.github.createRepo(repoName, true);
            await this.repo.ensureRepoExists(cloneUrl);
        } else {
            await this.repo.ensureRepoExists(`https://github.com/${this.github.username}/${repoName}.git`);
        }

        // Migrate temp logs if repo is now available
        await this.migrateTempLogs();

    } catch (error) {
        log.error("Error setting up/checking repo:", error);
        vscode.window.showErrorMessage("Error setting up/checking repo. Logs will be stored temporarily.");
    }
}

async migrateTempLogs() {
  if (!this.repo) return; // Repo not initialized yet

  const tempLogs = fs.readdirSync(this.tempLogDir);
  if (tempLogs.length === 0) return;

  try {
      for (const logFile of tempLogs) {
          const tempLogPath = path.join(this.tempLogDir, logFile);
          const repoLogPath = path.join(this.repo.path, logFile);
          fs.copyFileSync(tempLogPath, repoLogPath);
          fs.unlinkSync(tempLogPath); // Remove temp file after copying
      }
      await this.repo.commitAndPush("Migrated temporary logs");
      log.info("Migrated temporary logs to the repository.");
  } catch (error) {
      log.error("Error migrating temporary logs:", error);
  }
}

async logActivity(workspaceFolders, logInterval) {
  for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      const git = simpleGit(folderPath);

      try {
          await git.checkIsRepo(); // Check if it's a repo, throws if not
      } catch (error) {
          if (error.message.includes("not a git repository")) {
              try {
                  await git.init();
                  log.info(`Initialized Git repository in ${folderPath}`);
                  await git.commit("Initial commit by Code Tracker");
              } catch (initError) {
                  log.error(`Error initializing Git repository in ${folderPath}:`, initError);
                  vscode.window.showErrorMessage(`Error initializing Git repository in ${folderPath}. Check logs for details.`)
                  return; // Important: Exit early if init fails
              }
          } else {
              log.error("Error checking repository:", error);
              vscode.window.showErrorMessage(`Error checking repository in ${folderPath}. Check logs for details.`)
              return; // Important: Exit early if check fails
          }
      }

      try {
          const status = await git.status();
          const changedFiles = status.files.filter(file => file.index !== ' ' || file.working_dir !== ' ');
          const commits = await this.logCommits(folderPath, `${logInterval} minutes ago`);

          const logFile = `.code-tracking-${new Date().toISOString()}.log`;
          const logPath = this.repo ? path.join(this.repo.path, logFile) : path.join(this.tempLogDir, logFile);

          const logData = {
              timestamp: new Date().toISOString(),
              commits: commits,
              changedFiles: changedFiles,
          };

          fs.appendFileSync(logPath, `${JSON.stringify(logData, null, 2)}\n`);

      } catch (error) {
          log.error("Error during logging:", error);
          vscode.window.showErrorMessage(`Error during logging for ${folderPath}. Check logs for details.`)
      }
  }
}

async logCommits(folderPath, since) {
  try {
      const git = simpleGit(folderPath);
      await git.checkIsRepo(); // Check if it's a repo, throws if not
      const logData = await git.log({ '--since': since, '--pretty': 'format:"%h %an %ad %s"', '--all': true, '--branches': true });
      return logData.all;
  } catch (error) {
      if (error.message.includes("not a git repository")) {
          try {
              const git = simpleGit(folderPath);
              await git.init();
              log.info(`Initialized Git repository in ${folderPath}`);
              // After initializing, you might want to make an initial commit
              await git.commit("Initial commit by Code Tracker");
              const logData = await git.log({ '--since': since, '--pretty': 'format:"%h %an %ad %s"', '--all': true, '--branches': true });
              return logData.all;
          } catch (initError) {
              log.error(`Error initializing Git repository in ${folderPath}:`, initError);
              vscode.window.showErrorMessage(`Error initializing Git repository in ${folderPath}. Check logs for details.`)
              return [];
          }
      } else {
          log.error("Error getting git log:", error);
          vscode.window.showErrorMessage(`Error getting git log for ${folderPath}. Check logs for details.`)
          return [];
      }
  }
}

startLogging() {
  const logInterval = this.config.get("logInterval") || 30;

  if (this.interval) {
      clearInterval(this.interval);
  }

  this.interval = setInterval(async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      try {
          await this.logActivity(workspaceFolders, logInterval)

          if (this.repo) {
              await this.repo.commitAndPush(`Auto log: ${new Date().toISOString()}`);
          } else {
              log.info("Logs stored temporarily as the repository is not initialized.");
          }

      } catch (error) {
          log.error("Error during logging:", error);
      }
  }, logInterval * 60 * 1000);
}

  stopLogging() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

module.exports = CodeTracker;
