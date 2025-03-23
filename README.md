# Twilio Agent Payments MCP Server

An MCP (Model Context Protocol) server that enables handling agent-assisted payments via the Twilio API, with enhanced features for asynchronous callbacks and guided workflow.

## Features

- Process secure payments during voice calls via Twilio
- Capture payment card information (card number, security code, expiration date)
- Tokenize payment information for PCI compliance
- Asynchronous callbacks via MCP Resources
- Guided workflow with MCP Prompts
- Support for re-entry of payment information
- Integrates with MCP clients like Claude Desktop
- Secure credential handling
- Uses Twilio API Keys for improved security

## Installation

You can use this server directly via npx:

```bash
npx twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret>
```

Or install it globally:

```bash
npm install -g twilio-agent-payments-mcp-server
twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret>
```

## Configuration

The server requires the following parameters:

- `accountSid`: Your Twilio Account SID (must start with 'AC', will be validated)
- `apiKey`: Your Twilio API Key (starts with 'SK')
- `apiSecret`: Your Twilio API Secret
- `statusCallback`: URL for Twilio to send payment status updates to

### Environment Variables

The following environment variables are required:

- `TOKEN_TYPE`: Type of token to use for payments (e.g., 'reusable', 'one-time')
- `CURRENCY`: Currency for payments (e.g., 'USD', 'EUR')
- `PAYMENT_CONNECTOR`: Payment connector to use with Twilio

### Security Note

This server uses API Keys and Secrets instead of Auth Tokens for improved security. This approach provides better access control and the ability to revoke credentials if needed. For more information, see the [Twilio API Keys documentation](https://www.twilio.com/docs/usage/requests-to-twilio).

## Usage with Claude Desktop

### Local Development

For local development (when the package is not published to npm), add the following to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "twilio-agent-payments": {
      "command": "node",
      "args": [
        "/PATHTONODE/twilio-agent-payments-mcp-server/build/index.js",
        "your_account_sid_here",
        "your_api_key_here",
        "your_api_secret_here",
        "+1234567890",
        "https://your-callback-url.com/payment-status"
      ],
      "env": {
        "TOKEN_TYPE": "reusable",
        "CURRENCY": "USD",
        "PAYMENT_CONNECTOR": "your_connector_name"
      }
    }
  }
}
```

Replace the values with your actual Twilio credentials and configuration.

### After Publishing to npm

Once the package is published to npm, you can use the following configuration:

```json
{
  "mcpServers": {
    "twilio-agent-payments": {
      "command": "npx",
      "args": [
        "-y", 
        "twilio-agent-payments-mcp-server",
        "your_account_sid_here",
        "your_api_key_here",
        "your_api_secret_here",
        "+1234567890",
        "https://your-callback-url.com/payment-status"
      ],
      "env": {
        "TOKEN_TYPE": "reusable",
        "CURRENCY": "USD",
        "PAYMENT_CONNECTOR": "your_connector_name"
      }
    }
  }
}
```

## Integration with Host Applications

One of the key advantages of the Model Context Protocol (MCP) is that it eliminates the need for extensive manual configuration of LLM context. The MCP server automatically provides all necessary tool definitions, resource templates, and capabilities to the LLM client.

### Setting Up Your Host Application

To integrate this MCP server into your own host application:

1. **Implement an MCP Client**: Use an existing MCP client library or implement the MCP client protocol in your application.

2. **Connect to the MCP Server**: Configure your application to connect to the Twilio Agent Payments MCP server.

3. **Let the Protocol Handle the Rest**: The MCP server will automatically:
   - Register its tools and resources with your client
   - Provide input schemas for all tools
   - Supply contextual prompts to guide the LLM through the payment flow

No manual definition of tools or resources is required in your LLM's context - the MCP protocol handles this discovery automatically.

### Example Integration Code

Here's a simplified example of how to integrate with an MCP client:

```javascript
// Initialize your MCP client
const mcpClient = new McpClient();

// Connect to the Twilio Agent Payments MCP server
await mcpClient.connectToServer({
  name: "twilio-agent-payments",
  // Connection details depend on your specific MCP client implementation
  // This could be a WebSocket URL, stdio connection, or other transport
});

// The client will automatically discover available tools and resources

// When the LLM wants to use a tool, your application can handle it like this:
function handleLlmToolRequest(toolRequest) {
  // The toolRequest would contain:
  // - server_name: "twilio-agent-payments"
  // - tool_name: e.g., "startPaymentCapture"
  // - arguments: e.g., { callSid: "CA1234567890abcdef" }
  
  return mcpClient.callTool(toolRequest);
}

// Similarly for resources:
function handleLlmResourceRequest(resourceRequest) {
  // The resourceRequest would contain:
  // - server_name: "twilio-agent-payments"
  // - uri: e.g., "payment://CA1234567890abcdef/PA9876543210abcdef/status"
  
  return mcpClient.accessResource(resourceRequest);
}
```

### Minimal LLM Context Required

The LLM only needs to know that it can use the Twilio Agent Payments MCP server for handling payments. A simple instruction in your system prompt is sufficient:

```
You have access to a Twilio Agent Payments MCP server that can help process secure payments during voice calls. 
When a customer wants to make a payment, you can use the tools provided by this server to securely capture 
payment information while maintaining PCI compliance.

The server will guide you through the payment process with contextual prompts at each step.
```

The MCP server itself provides all the detailed tool definitions, input schemas, and contextual prompts to guide the LLM through the payment flow.

## Available Tools

### startPaymentCapture

Initiates a payment capture process for an active call.

Parameters:
- `callSid`: The Twilio Call SID for the active call

Returns:
- `paymentSid`: The Twilio Payment SID for the new payment session
- `prompt`: A markdown-formatted prompt to guide the LLM through the next steps

### updatePaymentField

Updates a payment field with a specific capture type.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session
- `captureType`: The type of capture to perform (e.g., 'payment-card-number', 'security-code', 'expiration-date')

Returns:
- `success`: Boolean indicating success
- `prompt`: A markdown-formatted prompt to guide the LLM through the next steps

### resetPaymentField

Resets a payment field for re-entry when a customer makes a mistake.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session
- `field`: The field to reset ('cardNumber', 'securityCode', or 'expirationDate')

Returns:
- `success`: Boolean indicating success
- `prompt`: A markdown-formatted prompt to guide the LLM through the re-entry process

### completePaymentCapture

Completes a payment capture session.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session

Returns:
- `success`: Boolean indicating success
- `token`: The payment token (if successful)
- `prompt`: A markdown-formatted prompt to guide the LLM through completion

### getPaymentStatus

Gets the current status of a payment session.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session

Returns:
- Detailed status information about the payment session
- Current state of all payment fields
- `prompt`: A markdown-formatted prompt to guide the LLM based on the current state

## Available Resources

### payment://{callSid}/{paymentSid}/status

Get the current status of a payment session as a JSON object.

### payment://{callSid}/{paymentSid}/prompt

Get a markdown-formatted prompt for the current payment state to guide the LLM through the next steps.

## Architecture

This MCP server implements an enhanced architecture for handling payment flows:

### State Management

The server maintains an in-memory state store for payment sessions, tracking:
- Session status ('initialized', 'in-progress', 'complete', 'error')
- Card number state (masked value, completion status, re-entry needs)
- Security code state
- Expiration date state
- Payment token (when complete)

### Callback Handling

An Express server handles asynchronous callbacks from Twilio:
- Listens on the configured port (default: 3000)
- Processes callbacks for different payment stages
- Updates the state store based on callback data
- Handles error conditions and re-entry scenarios

### MCP Resources

Dynamic resources provide access to payment state:
- `payment://{callSid}/{paymentSid}/status`: Current payment status as JSON
- `payment://{callSid}/{paymentSid}/prompt`: Contextual prompt for the current state

### MCP Prompts

Contextual prompts guide the LLM through the payment flow:
- Start capture prompt
- Card number capture prompt
- Security code capture prompt
- Expiration date capture prompt
- Completion prompt
- Error handling prompts
- Re-entry prompts for correction scenarios

## Development

To build the project:

```bash
npm install
npm run build
```

### Prerequisites

- Node.js 14+
- Express (for callback handling)
- Twilio SDK

### Running the Server Manually

To start the server manually for testing (outside of Claude Desktop):

```bash
# Run with actual credentials
node build/index.js "your_account_sid_here" "your_api_key_here" "your_api_secret" "+1234567890" "https://your-callback-url.com/payment-status"

# Or use the npm script (which uses ts-node for development)
npm run dev -- "your_account_sid_here" "your_api_key_here" "your_api_secret" "+1234567890" "https://your-callback-url.com/payment-status"
```

The server will start and wait for MCP client connections.

When using with Claude Desktop, the server is started automatically when Claude loads the configuration file. You don't need to manually start it.

## PCI Compliance

This server helps with PCI compliance by tokenizing payment card information. The actual card data is handled by Twilio and never stored in your system. For more information on Twilio's PCI compliance, see the [Twilio documentation on secure payments](https://www.twilio.com/docs/voice/tutorials/secure-payment-processing).

## License

MIT

## MCP Inspector Compatibility

When using this server with the MCP Inspector, note that all logging is done via `console.error()` instead of `console.log()`. This is intentional and necessary for compatibility with the MCP protocol, which uses stdout for JSON communication.

If you're extending this server or debugging issues:

1. Use `console.error()` for all logging to ensure logs go to stderr
2. Avoid using `console.log()` as it will interfere with the MCP protocol's JSON messages on stdout
3. Keep logging minimal to avoid cluttering the terminal output

This approach ensures that the MCP Inspector can properly parse the JSON messages exchanged between the server and client without interference from log messages.

## MCP Server Logging

### Logging Configuration

The Twilio Agent Payments MCP server implements logging capabilities according to the [MCP specification](https://spec.modelcontextprotocol.io/specification/2024-11-05/server/utilities/logging/#capabilities). Logging must be explicitly configured when initializing the MCP server:

```javascript
const mcpServer = new McpServer(SERVER_CONFIG, {
    capabilities: {
        logging: {}
    }
});
```

This configuration is critical - without it, any attempts to use logging functionality will result in runtime errors with messages like:

```
Error: Server does not support logging (required for notifications/message)
```

### Event-Based Logging Architecture

The server uses an event-based logging architecture:

1. **Event Emitters**: Both the `CallbackHandler` and `TwilioAgentPaymentServer` classes extend Node.js's `EventEmitter` and emit 'log' events with level and message data.

2. **Log Forwarding**: These events are captured by event listeners and forwarded to the MCP server's logging system:

   ```javascript
   // Set up event listeners for callback handler logs
   callbackHandler.on('log', forwardLogToMcp);

   // Set up event listeners for Twilio agent payment server logs
   twilioAgentPaymentServer.on('log', forwardLogToMcp);
   ```

3. **MCP Integration**: The `forwardLogToMcp` function transforms these events into MCP-compatible log messages:

   ```javascript
   const forwardLogToMcp = (data: { level: string, message: string }) => {
       // Only use valid log levels: info, error, debug
       // If level is 'warn', treat it as 'info'
       const mcpLevel = data.level === 'warn' ? 'info' : data.level as "info" | "error" | "debug";

       // Send the log message to the MCP server's underlying Server instance
       mcpServer.server.sendLoggingMessage({
           level: mcpLevel,
           data: data.message,
       });
   };
   ```

### Supported Log Levels

The server supports the following log levels:

- `info`: General information messages
- `error`: Error messages and exceptions
- `debug`: Detailed debugging information
- `warn`: Warning messages (automatically converted to 'info' for MCP compatibility)

### Troubleshooting Logging Issues

If you encounter logging-related errors:

1. **Check MCP Server Configuration**: Ensure the server is initialized with the correct logging capability as shown above.

2. **Verify MCP SDK Version**: Make sure you're using a compatible version of the MCP SDK that supports the logging capability structure.

3. **Inspect Error Messages**: Look for specific error messages that might indicate configuration issues:
   - `Server does not support logging (required for notifications/message)`: This indicates the logging capability is not properly configured.

4. **Check Event Listeners**: Ensure that event listeners are properly set up to forward logs from your components to the MCP server.

5. **Fallback Logging**: In development environments, you may want to implement fallback logging to console.error() if MCP logging fails, but be aware this can clutter the output.
