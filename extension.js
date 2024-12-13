const vscode = require("vscode"); // Import the VS Code API
const fs = require("fs"); // Import the file system module for file operations
const exec = require("child_process").exec; // Import exec to run shell commands
const { Octokit } = require("@octokit/rest"); // Import Octokit for GitHub API interactions

let octokit; // Octokit instance for GitHub API
let repoDir; // Directory where the repository will be cloned

async function createRepo(repoName) {              
  const config = vscode.workspace.getConfiguration("codeTracking");                                                                                     
   const username = config.get("githubUsername");                                                                                                     
  // Attempt to retrieve the existing repository                                                                                                        
  try {                                                                                                                                                 
    const { data } = await octokit.repos.get({                                                                                                          
      owner: username,                                                                                                                          
      repo: repoName,                                                                                                                                   
    });                                                                                                                                                 
    vscode.window.showInformationMessage(`Using existing repository "${repoName}" as the default for logging.`);                                        
    return data.clone_url;                                                                                                                              
  } catch (error) {                                                                                                                                     
    // If the repository retrieval fails, it means the repository does not exist                                                                        
    // So, try to create a new repository                                                                                                               
    return createNewRepo(repoName, username);                                                                                                                     
  }                                                                                                                                                     
}

async function createNewRepo(repoName, username) {                                                                                                                
  try {                                                                                                                                                 
    const { data } = await octokit.repos.createForAuthenticatedUser({                                                                                   
      name: repoName,                                                                                                                                   
      private: false,                                                                                                                                   
    });                                                                                                                                                 
    return data.clone_url;                                                                                                                              
  } catch (error) {       
    console.log(`https://github.com/${username}/${repoName}.git`)                                                                                                                                                                              
      return `https://github.com/${username}/${repoName}.git`;                                                                                        
  }                                                                                                                                                     
}

function isValidToken(githubToken) {                                   
  // #NOTE: EDIT Later                                                                                 
  return typeof githubToken === 'string' && githubToken.trim() !== '';                                                                                  
}

async function setGitHubToken() {                                                                                                                       
  const config = vscode.workspace.getConfiguration("codeTracking");                                                                                     
  let githubToken = config.get("githubToken");                                                                                                          
                                                                                                                                                        
  // Check if the token is valid or empty                                                                                                               
  if (!githubToken || !isValidToken(githubToken)) {                                                                                                     
    // Prompt the user to enter their GitHub token                                                                                                      
    const token = await vscode.window.showInputBox({                                                                                                    
      prompt: "Enter your GitHub token",                                                                                                                
      ignoreFocusOut: true,                                                                                                                             
    });                                                                                                                                                 
                                                                                                                                                        
    if (token) {                                                                                                                                        
      // Update the token in the configuration                                                                                                          
      await vscode.workspace                                                                                                                            
        .getConfiguration()                                                                                                                             
        .update("codeTracking.githubToken", token.toString(), vscode.ConfigurationTarget.Global);                                                       
    }                                                                                                                                                   
  }                                                                                                                                                     
}

function initializeOctokit(token, username) {                                                                                                           
  octokit = new Octokit({ auth: token, username: username });                                                                                           
  console.log("GitHub token and username retrieved and Octokit initialized.");                                                                          
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

async function setGitHubUsername() {                                                                                                                    
  const config = vscode.workspace.getConfiguration("codeTracking");                                                                                     
  let githubUsername = config.get("githubUsername");                                                                                                    
                                                                                                                                                        
  // Check if the username is valid or empty                                                                                                            
  if (!githubUsername) {                                                                                            
    // Prompt the user to enter their GitHub username                                                                                                   
    const username = await vscode.window.showInputBox({                                                                                                 
      prompt: "Enter your GitHub username",                                                                                                             
      ignoreFocusOut: true,                                                                                                                             
    });                                                                                                                                                 
                                                                                                                                                        
    if (username) {                                                                                                                                     
      // Update the username in the configuration                                                                                                       
      await vscode.workspace                                                                                                                            
        .getConfiguration()                                                                                                                             
        .update("codeTracking.githubUsername", username.toString(), vscode.ConfigurationTarget.Global);                                                 
    }                                                                                                                                                   
  }                                                                                                                                                     
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
  context.subscriptions.push(                                                                                                                           
    vscode.commands.registerCommand(                                                                                                                    
      "codeTracking.setGitHubUsername",                                                                                                                 
      setGitHubUsername                                                                                                                                 
    )                                                                                                                                                   
  );

  const config = vscode.workspace.getConfiguration("codeTracking"); // Get configuration settings                                                       
   let githubToken = config.get("githubToken");                                                                                                          
   let githubUsername = config.get("githubUsername");                                                                                                    
                                                                                                                                                         
   if (!githubToken) {                                                                                                                                   
     vscode.window.showInformationMessage("GitHub token is not set. Please enter it now.");                                                              
     setGitHubToken().then(() => {                                                                                                                       
       githubToken = config.get("githubToken");                                                                                                          
       if (!githubToken) {                                                                                                                               
         vscode.window.showErrorMessage("GitHub token is still not set. Please set it using the command palette.");                                      
         return;                                                                                                                                         
       }                                                                                                                                                 
     });                                                                                                                                                 
   }                                                                                                                                                     
                                                                                                                                                         
   if (!githubUsername) {                                                                                                                                
     vscode.window.showInformationMessage("GitHub username is not set. Please enter it now.");                                                           
     setGitHubUsername().then(() => {                                                                                                                    
       githubUsername = config.get("githubUsername");                                                                                                    
       if (!githubUsername) {                                                                                                                            
         vscode.window.showErrorMessage("GitHub username is still not set. Please set it using the command palette.");                                   
         return;                                                                                                                                         
       }                                                                                                                                                 
     });                                                                                                                                                 
   }

   initializeOctokit(githubToken, githubUsername);

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
     // Check if the repoDir directory is a valid Git repository                                                                                         
     try {                                                                                                                                               
       execSync(`git -C ${repoDir} rev-parse --is-inside-work-tree`, { stdio: 'ignore' });                                                               
     } catch (error) {                                                                                                                                   
       // If the repoDir directory is not a valid Git repository, clone the repository                                                                   
       repoUrl = await createRepo("github-tracker");                                                                                                     
       exec(`git clone ${repoUrl} ${repoDir}`, (err, stdout, stderr) => {                                                                                
         if (err) {                                                                                                                                      
           vscode.window.showErrorMessage(`Git clone error: ${stderr}`);                                                                                 
           return;                                                                                                                                       
         } else {                                                                                                                                        
           console.log("Git clone success:", stdout);                                                                                                    
         }                                                                                                                                               
       });                                                                                                                                               
     }                                                                                                                                                   
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
