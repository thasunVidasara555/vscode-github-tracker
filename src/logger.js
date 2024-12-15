const path = require('path');

const log = {
  _log: (level, ...args) => {
    const stack = new Error().stack;
    // Extract the caller's file and line number
    const callerLine = stack.split('\n')[3]; // Adjust index if needed
    if (callerLine) {
        const callerFileMatch = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);
        if (callerFileMatch) {
            const callerFile = path.basename(callerFileMatch[2]);
            const callerLineNumber = callerFileMatch[3]
            console[level](`[CodeTracking] [${callerFile}:${callerLineNumber}]`, ...args);
            return
        }
        const callerFileMatch2 = callerLine.match(/at (.+) (.+):(\d+):(\d+)/);
        if (callerFileMatch2) {
            const callerFile = path.basename(callerFileMatch2[2]);
            const callerLineNumber = callerFileMatch2[3]
            console[level](`[CodeTracking] [${callerFile}:${callerLineNumber}]`, ...args);
            return
        }
    }
    console[level]("[CodeTracking]", ...args); // Fallback if extraction fails
  },

  info: (...args) => log._log('info', ...args),
  warn: (...args) => log._log('warn', ...args),
  error: (...args) => log._log('error', ...args),
  debug: (...args) => log._log('debug', ...args),
};

module.exports = log;
