# Twilio Agent Payments MCP Server

An MCP (Model Context Protocol) server that enables handling agent-assisted payments via the Twilio API.

## Features

- Process secure payments during voice calls via Twilio
- Capture payment card information (card number, security code, expiration date)
- Tokenize payment information for PCI compliance
- Integrates with MCP clients like Claude Desktop
- Secure credential handling
- Uses Twilio API Keys for improved security

## Installation

You can use this server directly via npx:

```bash
npx twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret> <number> <statusCallback>
```

Or install it globally:

```bash
npm install -g twilio-agent-payments-mcp-server
twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret> <number> <statusCallback>
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

## Available Tools

### start-payment-capture

Initiates a payment capture process for an active call.

Parameters:
- `callSid`: The Twilio Call SID for the active call

### update-payment-session

Updates a payment session with a specific capture type.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session
- `captureType`: The type of capture to perform (e.g., 'payment-card-number', 'security-code', 'expiration-date')

### finish-payment-capture

Completes a payment capture session.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session

## Development

To build the project:

```bash
npm install
npm run build
```

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
