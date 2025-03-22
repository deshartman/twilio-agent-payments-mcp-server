// Check if running in an MCP environment
const isMcpEnvironment = process.argv.length >= 2 && process.argv[2].startsWith('AC');

// Disable colors when running in MCP environment to avoid JSON parsing issues
const colors = isMcpEnvironment ? {
    reset: '',
    green: '',
    red: ''
} : {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m'
};

/**
 * Gets the current timestamp in local timezone with milliseconds
 * @returns {string} Formatted timestamp string
 */
const getTimestamp = (): string => {
    const now = new Date();
    const dateTimeStr = now.toLocaleString(undefined, {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Add milliseconds
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `${dateTimeStr}.${ms}`;
};

/**
 * Logs a standard message to the console
 * @param {string} identifier - The component or service identifier
 * @param {string} message - The message to log
 */
const logOut = (identifier: string, message: string): void => {
    console.log(`${colors.green}[${getTimestamp()}] [${identifier}] ${message}${colors.reset}`);
};

/**
 * Logs an error message to the console
 * @param {string} identifier - The component or service identifier
 * @param {string} message - The error message to log
 */
const logError = (identifier: string, message: string): void => {
    console.error(`${colors.red}[${getTimestamp()}] [${identifier}] ${message}${colors.reset}`);
};

export {
    logOut,
    logError
};
