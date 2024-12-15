const { Octokit } = require("@octokit/rest");
const log = require("./logger"); // Import logger

class GitHub {
  constructor(token, username) {
    if (!token) {
      log.error("GitHub token is required.");
      throw new Error("GitHub token is required.");
    }
    this.octokit = new Octokit({ auth: token, username: username });
    this.username = username;
  }

  async createRepo(repoName, isPrivate = false) {
    try {
      const { data } = await this.octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: isPrivate,
      });
      return data.clone_url;
    } catch (error) {
      log.error(`Failed to create repository: ${error.message}`);
        log.error("Full error object:", error); // VERY IMPORTANT
        if (error.request) {
            log.error("Request details:", {
                method: error.request.method,
                url: error.request.url,
                headers: error.request.headers,
                body: error.request.body, // Be cautious about logging sensitive data
            });
        }
      // Fallback to constructing the URL manually (less reliable)
      return `https://github.com/${this.username}/${repoName}.git`;
    }
  }

  async repoExists(repoName) {
    try {
      await this.octokit.repos.get({
        owner: this.username,
        repo: repoName,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = GitHub;
