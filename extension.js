const vscode = require("vscode"); // Import the VS Code API
const fs = require("fs"); // Import the file system module for file operations
const exec = require("child_process").exec; // Import exec to run shell commands
const { Octokit } = require("@octokit/rest"); // Import Octokit for GitHub API interactions

let octokit; // Octokit instance for GitHub API
let repoDir; // Directory where the repository will be cloned

async function createRepo(repoName, isPrivate=false) {              
  const config = vscode.workspace.getConfiguration("codeTracking");                                                                                     
   const username = config.get("githubUsername");                                                                                                     
  // Attempt to retrieve the existing repository                                                                                                        
  try {                                                                                                                                                 
    const { data } = await octokit.repos.get({                                                                                                          
      owner: username,                                                                                                                          
      repo: repoName,                                                                                                                                   
    });                                                                                                                                                 
    vscode.window.showInformationMessage(`Using existing repository "${repoName}" for logging.`);                                        
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
      private: isPrivate ? true : false,                                                                                                                                   
    });                                                                                                                                                 
    return data.clone_url;                                                                                                                              
  } catch (error) {       
    console.log(`https://github.com/${username}/${repoName}.git`)                                                                                                                                                                              
      return `https://github.com/${username}/${repoName}.git`;                                                                                        
  }                                                                                                                                                     
}

function isValidToken(githubToken) {                                   
  // #NOTE: Figure out later                                                                                 
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

async function checkGitHubRepo(githubRepoDir) {                                                                                                                                           
  try {                                                                                                                                                                                   
    // Check if the directory is a valid Git repository                                                                                                                                   
    execSync(`git -C ${githubRepoDir} rev-parse --is-inside-work-tree`, { stdio: 'ignore' });                                                                                             
                                                                                                                                                                                          
    // If the directory is a valid Git repository, perform a git pull to update it                                                                                                        
    exec(`git -C ${githubRepoDir} pull`, (err, stdout, stderr) => {                                                                                                                       
      if (err) {                                                                                                                                                                          
        vscode.window.showErrorMessage(`Git pull error: ${stderr}`);                                                                                                                      
        return;                                                                                                                                                                           
      } else {                                                                                                                                                                            
        console.log("Git pull success:", stdout);                                                                                                                                         
      }                                                                                                                                                                                   
    });                                                                                                                                                                                   
  } catch (error) {                                                                                                                                                                       
    // If the directory is not a valid Git repository, check if it exists and is not empty                                                                                                
    if (fs.existsSync(githubRepoDir) && fs.readdirSync(githubRepoDir).length > 0) return;                                                                                                                                                                          
                                                                                                                                                                                          
    // If the directory does not exist or is empty, clone the repository                                                                                                                  
    const githubRepoUrl = await createRepo("github-tracker");                                                                                                                             
    exec(`git clone ${githubRepoUrl} ${githubRepoDir}`, (err, stdout, stderr) => {                                                                                                        
      if (err) {                                                                                                                                                                          
        exec(`git -C ${githubRepoDir} pull origin main`, (err, stdout, stderr) => {                                                                                                                       
          if (err) {                                                                                                                                                                          
            vscode.window.showErrorMessage(`Git pull error: ${stderr}`);                                                                                                                      
            return;                                                                                                                                                                           
          } else {                                                                                                                                                                            
            console.log("Git pull success:", stdout);                                                                                                                                         
          }                                                                                                                                                                                   
        });                                                                                                                     
      } else {                                                                                                                                                                            
        console.log("Git clone success:", stdout);                                                                                                                                        
      }                                                                                                                                                                                   
    });                                                                                                                                                                                   
  }                                                                                                                                                                                       
}

// Activates the extension, setting up commands and intervals for logging.
function activate(context) {                                                                                                                            
  // vscode.window.showInformationMessage("Code Tracking Extension Activated!");                                                                           
                                                                                                                                                        
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
  context.subscriptions.push(                                                                                                                           
    vscode.commands.registerCommand("codeTracking.setRepoDir", setRepoDir)                                                                              
  );                                                                                                                                                    
  context.subscriptions.push(                                                                                                                           
    vscode.commands.registerCommand("codeTracking.enable", () => {                                                                                      
      vscode.window.showInformationMessage("Code Tracking Enabled");                                                                                    
    })                                                                                                                                                  
  );                                                                                                                                                    
  context.subscriptions.push(                                                                                                                           
    vscode.commands.registerCommand("codeTracking.disable", () => {                                                                                     
      vscode.window.showInformationMessage("Code Tracking Disabled");                                                                                   
    })                                                                                                                                                  
  );                                                                                                                                                    
                                                                                                                                                        
  const config = vscode.workspace.getConfiguration("codeTracking");                                                                                     
  let githubToken = config.get("githubToken");                                                                                                          
  let githubUsername = config.get("githubUsername");                                                                                                    
                                                                                                                                                        
  if (!githubToken) {                                                                                                                                   
    vscode.window.showErrorMessage("GitHub token is not set. Please enter it now.");                                                              
    setGitHubToken().then(() => {                                                                                                                       
      githubToken = config.get("githubToken");                                                                                                          
      if (!githubToken) {                                                                                                                               
        vscode.window.showErrorMessage("GitHub token is still not set. Please set it using the command palette.");                                      
        return;                                                                                                                                         
      }                                                                                                                                                 
      initializeOctokit(githubToken, githubUsername);                                                                                                   
      checkAndSetupRepo(config);                                                                                                                        
    });                                                                                                                                                 
  } else {                                                                                                                                              
    initializeOctokit(githubToken, githubUsername);                                                                                                     
    checkAndSetupRepo(config);                                                                                                                          
  }                                                                                                                                                     
}

function checkAndSetupRepo(config) {                                                                                                                    
  const githubRepoDir = config.repoDir || `${require("os").homedir()}/github-tracker`;                                                                  
  checkGitHubRepo(githubRepoDir).then(() => {                                                                                                           
    const logInterval = config.logInterval || 30; // Default to 30 minutes if not set                                                                  
    startLoggingInterval(logInterval);                                                                                                                  
  });                                                                                                                                                   
}                                                                                                                                                       
                                                                                                                                                        
function startLoggingInterval(logInterval) {                                                                                                            
  setInterval(() => {                                                                                                                                   
    const workspaceFolders = vscode.workspace.workspaceFolders; 
    const config = vscode.workspace.getConfiguration("codeTracking"); 
    const githubRepoDir = config.repoDir || `${require("os").homedir()}/github-tracker`;                                                                                          
    if (!workspaceFolders) return;                                                                                                                      
                                                                                                                                                        
    workspaceFolders.forEach(folder => {                                                                                              
      const folderPath = folder.uri.fsPath;                                                                                         
      const gitDir = `${folderPath}/.git`;                                                                                                              
                                                                                                                                                        
      try {                                                                                                                                                                               
        // Check if the directory is a valid Git repository                                                                                                                               
        execSync(`git -C ${folderPath} rev-parse --is-inside-work-tree`, { stdio: 'ignore' });                                                                                            
                                                                                                                                                                                          
        // If the directory is a valid Git repository, perform a git pull to update it                                                                                                    
        exec(`git -C ${folderPath} pull`, (err, stdout, stderr) => {                                                                                                                      
          if (err) {                                                                                                                                                                      
            vscode.window.showErrorMessage(`Git pull error: ${stderr}`);                                                                                                                  
            return;                                                                                                                                                                       
          } else {                                                                                                                                                                        
            console.log("Git pull success:", stdout);                                                                                                                                     
          }                                                                                                                                                                               
        });                                                                                                                                                                               
      } catch (error) {                                                                                                                                                                   
        // If the directory is not a valid Git repository, create one                                                                                                           
        createRepo(folder.name, true);                                                                                                                                                                               
      }                                                                                                                                                 
                                                                                                                                                        
      // Run git log to get commit history since the specified interval                                                                                 
      exec(                                                                                                                                             
        `git -C ${folderPath} log --all --branches --pretty=format:"%h %an %ad %s" --since="${logInterval} minutes ago"`,                                            
        (err, stdout, stderr) => {                                                                                                                      
          if (err) {                                                                                                                                    
            vscode.window.showErrorMessage(`Git log error: ${stderr}`);                                                                                 
            return;                                                                                                                                     
          }                                                                                                                                             
                                                                                                                                                        
          const commits = stdout.split("\n").filter(commit => commit.trim() !== "");                                                                    
          if (commits.length === 0) {                                                                                                                   
            console.log("No commits found in the specified time period.");                                                                              
            return;                                                                                                                                     
          }                                        
          console.log(commits);                                                                                                     
                                                                                                                                                        
          const logFile = `${githubRepoDir}/.code-tracking-${new Date().toISOString()}.log`;                                                                  
          console.log(logFile);
                                                                                                                                                        
          commits.forEach((commit) => {                                                                                                                 
            const [hash, author, date, subject] = commit.split(" ");                                                                                    
                                                                                                                                                        
            exec(                                                                                                                                       
              `git -C ${folderPath} rev-list --parents -n 1 ${hash}`,                                                                                   
              (err, stdout, stderr) => {                                                                                                                
                const isFirstCommit = stdout.trim().split(" ").length === 1;                                                                            
                                                                                                                                                        
                if (isFirstCommit) {                                                                                                                    
                  const logMessage = `Repository initialized. First commit ${hash} by ${author} on ${date}: ${subject}`;                                
                  fs.appendFileSync(logFile, `${logMessage}\n\n`);                                                                                      
                } else {                                                                                                                                
                  exec(                                                                                                                                 
                    `git -C ${folderPath} branch --contains ${hash}`,                                                                                   
                    (err, branchStdout, stderr) => {                                                                                                    
                      const branchName = branchStdout.trim().split("\n")[0].replace("* ", "");                                                          
                                                                                                                                                        
                      exec(                                                                                                                             
                        `git -C ${folderPath} diff --name-status ${hash}^ ${hash}`,                                                                     
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
                                                                                                                                                        
          exec(                                                                                                                                         
            `git -C ${githubRepoDir} add . && git -C ${githubRepoDir} commit -m "Auto log: ${new Date().toISOString()}" && git -C ${githubRepoDir} push`,                 
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
    });                                                                                                                                                 
  }, logInterval * 60 * 1000);                                                                                                                          
}

/**
 * Deactivates the extension.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
