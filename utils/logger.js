const colors = {
  blue: (t) => `\x1b[34m${t}\x1b[0m`,
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export const logger = {
  debug: (...args) => console.log(`[${timestamp()}] ${colors.cyan('DEBUG')}`, ...args),
  info: (...args) => console.log(`[${timestamp()}] ${colors.blue('INFO')}`, ...args),
  success: (...args) => console.log(`[${timestamp()}] ${colors.green('SUCCESS')}`, ...args),
  warn: (...args) => console.log(`[${timestamp()}] ${colors.yellow('WARN')}`, ...args),
  error: (...args) => console.log(`[${timestamp()}] ${colors.red('ERROR')}`, ...args),
  command: (...args) => console.log(`[${timestamp()}] ${colors.cyan('CMD')}`, ...args),
};

export default logger;
