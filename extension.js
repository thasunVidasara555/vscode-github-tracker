const vscode = require("vscode"); // Import the VS Code API
const fs = require("fs"); // Import the file system module for file operations
const exec = require("child_process").exec; // Import exec to run shell commands
const { Octokit } = require("@octokit/rest"); // Import Octokit for GitHub API interactions

let octokit; // Octokit instance for GitHub API
let repoDir; // Directory where the repository will be cloned

async function createRepo(repoName) {                                                                                                                                   
  // Attempt to create a new repository                                                                                                                                 
  try {                                                                                                                                                                 
    const { data } = await octokit.repos.createForAuthenticatedUser({                                                                                                   
      name: repoName,                                                                                                                                                   
      private: false,                                                                                                                                                   
    });                                                                                                                                                                 
    return data.clone_url;                                                                                                                                              
  } catch (error) {                                                                                                                                                     
    // If the repository creation fails with an error message indicating that the repository name already exists on the user's account                                  
    if (error.status === 422 && error.errors && error.errors[0].message === "name already exists on this account") {                                                    
      // Retrieve the existing repository and return the clone URL                                                                                                      
      try {                                                                                                                                                             
        const { data } = await octokit.repos.get({                                                                                                                      
          owner: octokit.username,                                                                                                                                      
          repo: repoName,                                                                                                                                               
        });                                                                                                                                                             
        vscode.window.showInformationMessage(`Using existing repository "${repoName}" as the default for logging.`);                                                    
        return data.clone_url;                                                                                                                                          
      } catch (error) {                                                                                                                                                 
        // If the repository retrieval fails, throw an error                                                                                                            
        vscode.window.showErrorMessage(`Failed to retrieve repository: ${error.message}`);                                                                              
        throw error;                                                                                                                                                    
      }                                                                                                                                                                 
    } else {                                                                                                                                                            
      // If the error is not a repository name conflict error, re-throw the error                                                                                       
      throw error;                                                                                                                                                      
    }                                                                                                                                                                   
  }                                                                                                                                                                     
}

async function setGitHubToken() {
  // Prompt the user to enter their GitHub token
  const token = await vscode.window.showInputBox({
    prompt: "Enter your GitHub token",
    ignoreFocusOut: true,
  });
  if (token) {
    octokit = new Octokit({ auth: token }); // Initialize Octokit with the token
    await vscode.workspace
      .getConfiguration()
      .update("codeTracking.githubToken", token.toString(), vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage("GitHub token set. Please reload the window to apply changes.", "Reload")
      .then(selection => {
        if (selection === "Reload") {
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      });
  }
}

async function setRepoDir() {
  // Prompt the user to enter the directory for cloning the repository
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

function initializeOctokit(token) {
  octokit = new Octokit({ auth: token });
  console.log("GitHub token retrieved and Octokit initialized.");
}

// Activates the extension, setting up commands and intervals for logging.
function activate(context) {
  vscode.window.showInformationMessage("Code Tracking Extension Activated!"); // Notify user of activation

  // Register commands for setting GitHub token and repository directory
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codeTracking.setGitHubToken",
      setGitHubToken
    )
  );

  const config = vscode.workspace.getConfiguration("codeTracking"); // Get configuration settings
  let githubToken = config.get("githubToken");

  if (!githubToken) {
    vscode.window.showInformationMessage("GitHub token is not set. Please enter it now.");
    setGitHubToken().then(() => {
      githubToken = config.get("githubToken");
      if (!githubToken) {
        vscode.window.showErrorMessage("GitHub token is still not set. Please set it using the command palette.");
        return;
      }
      initializeOctokit(githubToken);
    });
  } else {
    initializeOctokit(githubToken);
  }

  repoDir = config.repoDir || `${require("os").homedir()}/github-tracker`;

  const logInterval = config.logInterval || 0.5; // Default to 30 minutes if not set
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.setRepoDir", setRepoDir)
  );

  // Register enable and disable commands
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.enable", () => {
      vscode.window.showInformationMessage("Code Tracking Enabled");
      // Add any additional logic needed when enabling code tracking
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codeTracking.disable", () => {
      vscode.window.showInformationMessage("Code Tracking Disabled");
      // Add any additional logic needed when disabling code tracking
    })
  );

  // Start the logging interval
  setInterval(async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders; // Get the workspace folders
    if (!workspaceFolders) return;

    const gitDir = `${repoDir}/.git`; // Path to the .git directory
    let repoUrl;
    if (!fs.existsSync(gitDir)) {
      repoUrl = await createRepo("github-tracker"); // Create a new repository if it doesn't exist
      // Clone the repository to the specified directory
      exec(`git clone ${repoUrl} ${repoDir}`, (err, stdout, stderr) => {
        if (err) {
          vscode.window.showErrorMessage(`Git clone error: ${stderr}`);
          return;
        } else {
          console.log("Git clone success:", stdout);
        }
      });
    }

    // Run git log to get commit history since the specified interval
    exec(
      `git -C ${repoDir} log --all --branches --pretty=format:"%h %an %ad %s" --since="${logInterval} minutes ago"`,
      (err, stdout, stderr) => {
        if (err) {
          vscode.window.showErrorMessage(`Git log error: ${stderr}`);
          return;
        }

        const commits = stdout.split("\n").filter(commit => commit.trim() !== ""); // Filter out empty lines
        if (commits.length === 0) {
          console.log("No commits found in the specified time period.");
          return;
        }

        const logFile = `${repoDir}/.code-tracking-${new Date().toISOString()}.log`;

        commits.forEach((commit) => {
          const [hash, author, date, subject] = commit.split(" ");

          // Check if this is the first commit
          exec(
            `git -C ${repoDir} rev-list --parents -n 1 ${hash}`,
            (err, stdout, stderr) => {
              const isFirstCommit = stdout.trim().split(" ").length === 1;

              if (isFirstCommit) {
                // Log the initialization and first commit details
                const logMessage = `Repository initialized. First commit ${hash} by ${author} on ${date}: ${subject}`;
                fs.appendFileSync(logFile, `${logMessage}\n\n`);
              } else {
                // Get the branch name
                exec(
                  `git -C ${repoDir} branch --contains ${hash}`,
                  (err, branchStdout, stderr) => {
                    const branchName = branchStdout.trim().split("\n")[0].replace("* ", "");

                    // Get the diff summary between the current and previous commit
                    exec(
                      `git -C ${repoDir} diff --name-status ${hash}^ ${hash}`,
                      (err, diffStdout, stderr) => {
                        if (err) {
                          vscode.window.showErrorMessage(`Git diff error: ${stderr}`);
                          return;
                        }

                        const diffSummary = diffStdout.trim();
                        const logMessage = `Branch: ${branchName}\nCommit ${hash} by ${author} on ${date}: ${subject}\n${diffSummary}`;
                        fs.appendFileSync(logFile, `${logMessage}\n\n`);
                      }
                    );
                  }
                );
              }
            }
          );
        });

        // Add, commit, and push changes to the repository
        exec(
          `git -C ${repoDir} add . && git -C ${repoDir} commit -m "Auto log: ${new Date().toISOString()}" && git -C ${repoDir} push`,
          (err, stdout, stderr) => {
            if (err) {
              vscode.window.showErrorMessage(`Git commit error: ${err.message}`);
            } else {
              console.log("Git commit success:", stdout);
            }
          }
        );
      }
    );
  }, logInterval * 60 * 1000); // Use the configured interval
}

/**
 * Deactivates the extension.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
