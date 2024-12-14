# Code Tracking VS Code Extension

A productivity-focused VS Code extension that tracks coding contributions more accurately by logging coding activity every 30 minutes into a dedicated Git repository.

## Features

- **Automatic Logging:** Logs coding activity every 30 minutes.
- **Git Integration:** Automatically commits logs to a dedicated `code-tracking` branch.
- **Transparency:** Maintains an open and meticulous record of your daily contributions.
- **Support for Work Reviews:** Provides an activity timeline for job reviews, promotions, or retrospectives.

## Upcoming(considered)
- Sum-up by LLM
- Generate logs only if there is been a commit to a branch

## Issues 
- if the repo is not cloned correctly, it misses the logs
    > may be be fixed by saving them in a temp    

## How It Works

1. Creates a `.code-tracking.log` file in a seperate repo.
2. Logs your activity every 30 minutes with a timestamp and workspace path.

## Installation

1. Install [VS Code](https://code.visualstudio.com/).
2. Download the `.vsix` package (if not from the Marketplace).
3. Install the extension:
   - Open VS Code.
   - Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
   - Click the "..." menu and select "Install from VSIX".
   - Select the downloaded `.vsix` file.

## Usage

1. Open a workspace in VS Code.
2. Start coding!
3. Logs will appear in a `.code-tracking.log` file in the workspace folder.
4. View your contributions in the `code-tracking` branch.

## Commands

- **Enable Tracking:** Automatically starts logging your activity (runs on activation).
- **Disable Tracking:** Stops the auto-logging process.

## Development

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/vscode-code-tracking.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the extension in VS Code:
   - Open the project folder.
   - Press F5 to launch a new Extension Development Host window.
4. Configure:
   - The GitHub token is used to authenticate the GitHub API requests made by the extension. To get a GitHub token, you can follow these steps:
        1 Go to your GitHub account settings page (https://github.com/settings).  
        2 Click on "Developer settings" in the left sidebar.  
        3 Click on "Personal access tokens" in the left sidebar.  
        4 Click on "Generate new token" button.  
        5 Give your token a name and select the scopes that you need for the extension. For this extension, you will need the repo scope to create and manage repositories.  
        6 Click on "Generate token" button.  
        7 Copy the generated token and use it to set the GitHub token in the extension.
    - You can set the GitHub token in the extension by using the command palette (Ctrl+Shift+P or Cmd+Shift+P on Mac) and selecting the "Set GitHub Token" command. Then, you can paste the token in the input box that appears.

## Contributing

Contributions are welcome! Open issues for suggestions or submit pull requests.

## License

This project is open-source under the MIT License. See LICENSE for details.
