const simpleGit = require("simple-git");
const log = require("./logger");

class GitRepo {
  constructor(path) {
    this.path = path;
    this.git = simpleGit(path);
  }

  async ensureRepoExists(remoteUrl) {
    try {
      await this.git.checkIsRepo();
      await this.git.pull();
    } catch (error) {
      if (error.message.includes("not a git repository")) {
        try {
          await this.git.clone(remoteUrl, this.path);
        } catch (cloneError) {
          log.error("Error cloning repository:", cloneError);
          throw new Error("Failed to clone repository.");
        }
      } else {
        log.error("Error pulling repository:", error);
        throw new Error("Failed to pull repository.");
      }
    }
  }

  async logCommits(since) {
    try {
      const logData = await this.git.log({
        "--since": since,
        "--pretty": 'format:"%h %an %ad %s"',
      });
      return logData.all;
    } catch (error) {
      log.error("Error getting git log:", error);
      return [];
    }
  }

  async commitAndPush(message) {
    try {
      await this.git.add(".");
      await this.git.commit(message);
      await this.git.push();
    } catch (error) {
      log.error("Error committing and pushing:", error);
      throw new Error("Failed to commit and push.");
    }
  }
}

module.exports = GitRepo;
