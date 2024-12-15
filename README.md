# Code Tracking VS Code Extension

A productivity-focused VS Code extension that tracks coding contributions more accurately by logging coding activity every 30 minutes into a dedicated Git repository.

## Features

*   **Automatic Tracking:** Logs your coding activity in the background.
*   **Private Repository:** Uses a private GitHub repository for secure log storage.
*   **Configurable Interval:** Customize the logging frequency.
*   **Detailed Logs:** Records commit messages, timestamps, *and uncommitted file changes*.
*   **Handles Multiple Workspaces:** Tracks activity across multiple open workspace folders.
*   **Robust Error Handling:** Includes error handling and logging for informative messages.
*   **Logs Uncommitted Changes:** Tracks file changes even before they are committed.
*   **Automatic Git Repository Initialization:** Automatically initializes a Git repository in the workspace folder if one doesn't exist.
*   **Temporary Log Storage:** Stores logs temporarily if the GitHub repository is unavailable and migrates them when it becomes available.

## Upcoming(considered)
- Sum-up by LLM
- Generate logs only if there is been a commit to a branch

## Issues 
- if the repo is not cloned correctly, it misses the logs
    > may be be fixed by saving them in a temp    

## How It Works

1.  **Configuration:** Upon activation, the extension prompts you to enter your GitHub personal access token and username. You can also configure the local repository directory and logging interval in VS Code settings.
2.  **Repository Setup:** The extension checks for a dedicated GitHub repository named `github-tracker`. If it doesn't exist, the extension creates a new private repository for you. The repository is then cloned to your local machine. If the local directory is not a git repo it initializes one automatically.
3.  **Activity Logging:** At the configured interval (default: 30 minutes), the extension scans your open workspace folders. For each folder, it:
    *   Checks if the folder is a Git repository. If not, it initializes one.
    *   Retrieves recent commits (since the last log interval).
    *   Captures information about *uncommitted* file changes using `git status`.
    *   Records the data to a log file (JSON format) locally, either in the `github-tracker` repository (if set up) or in a temporary directory.
4.  **Logging to Repository:** If the `github-tracker` repository is available, the extension commits and pushes the log files to your GitHub repository. If the repository is not yet set up (e.g., due to authentication issues), logs are stored temporarily and migrated to the repository once it becomes available.

## Installation

1. Install [VS Code](https://code.visualstudio.com/).
2. Download the `.vsix` package (if not from the Marketplace).
3. Install the extension:
   - Open VS Code.
   - Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
   - Click the "..." menu and select "Install from VSIX".
   - Select the downloaded `.vsix` file.

## Configuration

1.  **GitHub Token:**
    *   Go to your GitHub settings: [https://github.com/settings/tokens](https://github.com/settings/tokens)
    *   Click "Generate new token" (or "Generate new token (classic)").
    *   Give the token a descriptive name.
    *   Select the `repo` scope (or appropriate granular repo permissions).
    *   Click "Generate token".
    *   Copy the generated token. *Keep it secure!*
2.  **VS Code Settings:**
    *   Open VS Code settings (`File` > `Preferences` > `Settings` or `Code` > `Preferences` > `Settings` on macOS).
    *   Search for "Code Tracking".
    *   Configure the following:
        *   `codeTracking.githubToken`: Your GitHub personal access token.
        *   `codeTracking.githubUsername`: Your GitHub username.
        *   `codeTracking.repoDir` (Optional): The local directory for the `github-tracker` repository (defaults to `~/github-tracker`).
        *   `codeTracking.logInterval` (Optional): The logging interval in minutes (default: 30).

## Usage

1. Open a workspace in VS Code.
2. Start coding!
3. Logs will appear in a `.code-tracking.log` file in the workspace folder.
4. View your contributions in the `code-tracking` repo or repo directory.

## Commands

- **Enable Tracking:** Automatically starts logging your activity (runs on activation and startup of vscode).
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

## Contributing

Contributions are welcome! Open issues for suggestions or submit pull requests.

## License

This project is open-source under the MIT License. See [MIT License](LICENSE) details.
