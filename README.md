# Twilio Agent Payments MCP Server

An MCP (Model Context Protocol) server that enables handling agent-assisted payments via the Twilio API, with enhanced features for asynchronous callbacks and guided workflow through contextual prompts.

## Features

- Process secure payments during voice calls via Twilio
- Capture payment information (card number, security code, expiration date)
- Tokenize payment information for PCI compliance
- Asynchronous callbacks via MCP Resources
- Guided workflow with MCP Prompts for each step of the payment process
- Support for re-entry of payment information
- Integrates with MCP clients like Claude Desktop
- Secure credential handling
- Uses Twilio API Keys for improved security
- Event-based logging architecture

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

### Environmental Parameters

When installing the server, you need to provide the following parameters:

1. **Command-line arguments** (required):
   - `accountSid`: Your Twilio Account SID
   - `apiKey`: Your Twilio API Key
   - `apiSecret`: Your Twilio API Secret

2. **Environment variables** (set before running the server):
   - `TOKEN_TYPE`: Type of token to use for payments (e.g., 'reusable', 'one-time')
   - `CURRENCY`: Currency for payments (e.g., 'USD', 'EUR')
   - `PAYMENT_CONNECTOR`: Payment connector to use with Twilio
   - `NGROK_AUTH_TOKEN`: Your Ngrok authentication token (required for callback handling)
   - `NGROK_CUSTOM_DOMAIN`: Optional custom domain for Ngrok

Example with environment variables:
```bash
TOKEN_TYPE=reusable CURRENCY=USD PAYMENT_CONNECTOR=your_connector NGROK_AUTH_TOKEN=your_token npx twilio-agent-payments-mcp-server <accountSid> <apiKey> <apiSecret>
```

See the Configuration section below for more details on these parameters.

## Configuration

The server requires the following parameters:

- `accountSid`: Your Twilio Account SID (must start with 'AC', will be validated)
- `apiKey`: Your Twilio API Key (starts with 'SK')
- `apiSecret`: Your Twilio API Secret

### Environment Variables

The following environment variables are used for configuration:

- `TOKEN_TYPE`: Type of token to use for payments (e.g., 'reusable', 'one-time')
- `CURRENCY`: Currency for payments (e.g., 'USD', 'EUR')
- `PAYMENT_CONNECTOR`: Payment connector to use with Twilio
- `NGROK_AUTH_TOKEN`: Your Ngrok authentication token (required for callback handling)
- `NGROK_CUSTOM_DOMAIN`: Optional custom domain for Ngrok

Note: Twilio credentials (accountSid, apiKey, apiSecret) are provided as command-line arguments, not environment variables.

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
        "your_api_secret_here"
      ],
      "env": {
        "TOKEN_TYPE": "reusable",
        "CURRENCY": "USD",
        "PAYMENT_CONNECTOR": "your_connector_name",
        "NGROK_AUTH_TOKEN": "your_ngrok_auth_token_here",
        "NGROK_CUSTOM_DOMAIN": "your_custom_domain_here" // Optional
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
        "your_api_secret_here"
      ],
      "env": {
        ...process.env,   // Include existing environment variables so child process has access to the path
        "TOKEN_TYPE": "reusable",
        "CURRENCY": "USD",
        "PAYMENT_CONNECTOR": "your_connector_name",
        "NGROK_AUTH_TOKEN": "your_ngrok_auth_token_here",
        "NGROK_CUSTOM_DOMAIN": "your_custom_domain_here" // Optional
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

## Developer Implementation Notes

This section explains how the MCP server implementation is organized across different components and files, focusing on the architecture patterns used.

### Component Organization

The server implementation is split across several directories:

1. **src/index.ts**: The main entry point that:
   - Initializes the MCP server
   - Initializes the TwilioAgentPaymentServer singleton
   - Discovers and registers all components with the MCP server via auto-discovery
   - Sets up event listeners for logging
   - Connects the server to the transport layer

2. **src/tools/**: Contains individual tool implementations
   - Each tool is implemented as a factory function that returns an object with name, description, shape, and execute properties
   - Tools handle specific payment operations (e.g., StartPaymentCaptureTool, CaptureCardNumberTool)
   - Each tool defines its input schema using Zod and implements an execute method
   - Tools access the TwilioAgentPaymentServer singleton via getInstance()

3. **src/prompts/**: Contains prompt implementations
   - Each prompt is implemented as a factory function that returns an object with name, description, and execute properties
   - Prompts provide contextual guidance to the LLM for each step of the payment flow
   - Some prompts accept parameters that can be used to customize the prompt content

4. **src/resources/**: Contains resource implementations
   - Resources provide access to data (e.g., PaymentStatusResource)
   - Each resource is implemented as a factory function that returns an object with name, template, description, and read properties
   - Resources access the TwilioAgentPaymentServer singleton via getInstance()

5. **src/api-servers/**: Contains the implementation of the Twilio API client
   - Implements the TwilioAgentPaymentServer as a singleton
   - Handles communication with the Twilio API
   - Manages payment session state
   - Provides static methods for accessing the singleton instance

6. **src/utils/**: Contains utility functions
   - The autoDiscovery.ts file handles automatic discovery and registration of tools, prompts, and resources

### Singleton Pattern for TwilioAgentPaymentServer

A key architectural pattern in this codebase is the use of the Singleton pattern for the TwilioAgentPaymentServer:

```typescript
class TwilioAgentPaymentServer extends EventEmitter {
    // Singleton instance
    private static instance: TwilioAgentPaymentServer | null = null;

    /**
     * Static method to get the instance
     */
    public static getInstance(): TwilioAgentPaymentServer {
        if (!TwilioAgentPaymentServer.instance) {
            throw new Error('TwilioAgentPaymentServer not initialized. Call initialize() first.');
        }
        return TwilioAgentPaymentServer.instance;
    }
    
    /**
     * Static method to initialize the instance
     */
    public static initialize(accountSid: string, apiKey: string, apiSecret: string): TwilioAgentPaymentServer {
        if (!TwilioAgentPaymentServer.instance) {
            TwilioAgentPaymentServer.instance = new TwilioAgentPaymentServer(accountSid, apiKey, apiSecret);
        }
        return TwilioAgentPaymentServer.instance;
    }

    // Private constructor to prevent direct instantiation
    private constructor(accountSid: string, apiKey: string, apiSecret: string) {
        // Initialization code...
    }
}
```

Benefits of this approach:
- Ensures there's only one instance of TwilioAgentPaymentServer throughout the application
- Eliminates the need to pass the instance through multiple functions
- Provides a cleaner API with simpler function signatures
- Makes it easier to access the TwilioAgentPaymentServer from anywhere in the codebase

### Factory Function Pattern

Tools, prompts, and resources are implemented using the factory function pattern:

1. **In Tools**: 
   ```typescript
   // Example from StartPaymentCaptureTool.ts
   export function startPaymentCaptureTool() {
       // Get the TwilioAgentPaymentServer instance
       const twilioAgentPaymentServer = TwilioAgentPaymentServer.getInstance();
       
       // Create an event emitter for logging
       const emitter = new EventEmitter();
       
       return {
           name: "startPaymentCapture",
           description: "Start a new payment capture session",
           shape: schema.shape,
           execute: async function execute(params: z.infer<typeof schema>, extra: any): Promise<ToolResult> {
               // Implementation that calls Twilio API and returns result
           },
           emitter // For attaching event listeners
       }
   }
   ```

2. **In Resources**:
   ```typescript
   // Example from PaymentStatusResource.ts
   export function paymentStatusResource() {
       // Get the TwilioAgentPaymentServer instance
       const twilioAgentPaymentServer = TwilioAgentPaymentServer.getInstance();
       
       // Create an event emitter for logging
       const emitter = new EventEmitter();
       
       return {
           name: "PaymentStatus",
           template: new ResourceTemplate("payment://{callSid}/{paymentSid}/status", { list: undefined }),
           description: "Get the current status of a payment session",
           read: async (uri: URL, variables: Record<string, string | string[]>, extra: any): Promise<ResourceReadResult> => {
               // Implementation that retrieves and formats payment status data
           },
           emitter // For attaching event listeners
       };
   }
   ```

3. **In Prompts**:
   ```typescript
   // Example from a prompt factory function
   export function startCapturePrompt() {
       return {
           name: "StartCapture",
           description: "Prompt for starting the payment capture process",
           execute: (args: { callSid: string }, extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
               // Return prompt content
           }
       };
   }
   ```

### Auto-Discovery and Registration

The server uses an auto-discovery mechanism to find and register all components:

```typescript
// In src/utils/autoDiscovery.ts
export async function discoverComponents(mcpServer: McpServer) {
    // Get the current directory path
    const basePath: string = path.dirname(fileURLToPath(import.meta.url));

    await Promise.all([
        discoverTools(mcpServer, path.join(basePath, '../tools')),
        discoverPrompts(mcpServer, path.join(basePath, '../prompts')),
        discoverResources(mcpServer, path.join(basePath, '../resources'))
    ]);
}
```

This approach:
- Automatically finds all tools, prompts, and resources in their respective directories
- Dynamically imports and registers them with the MCP server
- Makes it easy to add new components without modifying the main file
- Reduces boilerplate code and improves maintainability

### Parameters in Prompts

Some prompts accept parameters that can be used to customize the prompt content. The StartCapturePrompt is a good example:

1. **Parameter Definition**:
   ```typescript
   // In the prompt factory function
   return {
       name: "StartCapture",
       description: "Prompt for starting the payment capture process",
       schema: { callSid: z.string().describe("The Twilio Call SID") }, // Parameter schema
       execute: (args: { callSid: string }, extra: RequestHandlerExtra) => {
           // Implementation
       }
   };
   ```
   - The schema property defines the parameter schema using Zod
   - In this case, it requires a `callSid` parameter of type string

2. **Parameter Usage in the Prompt**:
   ```typescript
   execute: (args: { callSid: string }, extra: RequestHandlerExtra): GetPromptResult | Promise<GetPromptResult> => {
     const { callSid } = args;

     if (!callSid) {
       throw new Error("callSid parameter is required");
     }
     
     return {
       messages: [
         {
           role: "assistant",
           content: {
             type: "text",
             text: getStartCapturePromptText(callSid), // Use the parameter in the prompt text
           }
         }
       ]
     };
   }
   ```
   - The execute method accepts the parameters as its first argument
   - It can validate the parameters and use them to customize the prompt content
   - In this case, the callSid is used in the prompt text to provide context

This pattern allows prompts to be dynamic and contextual, providing tailored guidance based on the current state of the payment flow.

## Available Tools

### startPaymentCapture

Initiates a payment capture process for an active call.

Parameters:
- `callSid`: The Twilio Call SID for the active call

IMPORTANT: The StartCapturePrompt.ts requires the user to enter a Call SID from the MCP Client side. This is a required parameter and the prompt will throw an error if it's not provided.

NOTE: When handling Twilio calls, you need to understand which call leg Call SID you are working with. Twilio Payments need to be
attached to the PSTN side call leg. If applied to the Twilio Client side, the DTMF digits will not be captured. As such this MCP Server
assumes the correct call leg is being used. Typically it is checked as below:

```javascript
 // Pseudo code: direction of the call
  if (event.CallDirection === "toPSTN") {
    theCallSid = event.CallSid;
  }

  if (event.CallDirection == "toSIP") {
    theCallSid = event.ParentCallSid;
  }
```

Returns:
- `paymentSid`: The Twilio Payment SID for the new payment session

### captureCardNumber

Starts the capture of the payment card number.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session
- `captureType`: Set to 'payment-card-number'

Returns:
- Status of the card number capture operation

### captureSecurityCode

Starts the capture of the card security code.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session
- `captureType`: Set to 'security-code'

Returns:
- Status of the security code capture operation

### captureExpirationDate

Starts the capture of the card expiration date.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session
- `captureType`: Set to 'expiration-date'

Returns:
- Status of the expiration date capture operation

### completePaymentCapture

Completes a payment capture session.

Parameters:
- `callSid`: The Twilio Call SID for the active call
- `paymentSid`: The Twilio Payment SID for the payment session

Returns:
- Status of the payment completion operation

## Available Resources

### payment://{callSid}/{paymentSid}/status

Get the current status of a payment session as a JSON object. This resource provides detailed information about the current state of the payment capture process, including:

- Payment SID
- Payment card number (masked)
- Payment card type
- Security code status
- Expiration date
- Payment confirmation code
- Payment result
- Payment token

## MCP Prompts

The server provides contextual prompts to guide the LLM through each step of the payment flow:

### StartCapture Prompt

Provides guidance on how to initiate the payment capture process, including:
- Instructions for asking the customer if they're ready to provide payment information
- Explanation of the secure processing and tokenization
- Steps to use the startPaymentCapture tool
- **IMPORTANT**: Requires the user to enter a Call SID from the MCP Client side, which is a mandatory parameter

### CardNumber Prompt

Guides the LLM on how to handle the card number capture process, including:
- Instructions for explaining to the customer what information is needed
- Tips for handling customer questions or concerns
- Steps to use the captureCardNumber tool

### SecurityCode Prompt

Provides guidance on capturing the card security code, including:
- Instructions for explaining what the security code is
- Tips for handling customer questions or concerns
- Steps to use the captureSecurityCode tool

### ExpirationDate Prompt

Guides the LLM on capturing the card expiration date, including:
- Instructions for explaining the format needed (MM/YY)
- Tips for handling customer questions or concerns
- Steps to use the captureExpirationDate tool

### FinishCapture Prompt

Provides guidance on completing the payment capture process, including:
- Instructions for confirming all information has been collected
- Steps to use the completePaymentCapture tool

### Completion Prompt

Guides the LLM on what to do after the payment has been successfully processed, including:
- Instructions for confirming the payment was successful
- Suggestions for next steps in the conversation

### Error Prompt

Provides guidance on handling errors during the payment capture process, including:
- Instructions for explaining the error to the customer
- Suggestions for troubleshooting common issues
- Steps to retry the payment capture process

## Architecture

This MCP server implements an enhanced architecture for handling payment flows:

### Event-Based Architecture

The server uses an event-based architecture with EventEmitter for communication between components:
- Each tool, resource, and server component extends EventEmitter
- Components emit events for logging and callbacks
- Event listeners forward logs to the MCP server's logging system

### Callback Handling

The server uses the @deshartman/mcp-status-callback package to handle asynchronous callbacks from Twilio:
- Creates a secure tunnel using Ngrok for receiving callbacks
- Processes callbacks for different payment stages
- Updates the state store based on callback data
- Handles error conditions and re-entry scenarios

### State Management

Payment state is managed through a Map-based store:
- The statusCallbackMap stores payment session data indexed by payment SID
- Each callback updates the state with the latest information
- The PaymentStatusResource provides access to this state data

### MCP Integration

The server integrates with the MCP protocol through:
- Tools: Defined with Zod schemas for input validation
- Resources: Providing access to payment state data
- Prompts: Contextual guidance for each step of the payment flow
- Logging: Event-based logging forwarded to the MCP server

## Development

To build the project:

```bash
npm install
npm run build
```

### Prerequisites

- Node.js 18+
- Express (for callback handling)
- Twilio SDK
- Ngrok account with auth token

### Running the Server Manually

To start the server manually for testing (outside of Claude Desktop):

```bash
# Run with actual credentials
node build/index.js "your_account_sid_here" "your_api_key_here" "your_api_secret"

# Or use the npm script (which uses ts-node for development)
npm run dev -- "your_account_sid_here" "your_api_key_here" "your_api_secret"
```

The server will start and wait for MCP client connections.

When using with Claude Desktop, the server is started automatically when Claude loads the configuration file. You don't need to manually start it.

## PCI Compliance

This server helps with PCI compliance by tokenizing payment card information. The actual card data is handled by Twilio and never stored in your system. For more information on Twilio's PCI compliance, see the [Twilio documentation on secure payments](https://www.twilio.com/docs/voice/tutorials/secure-payment-processing).

## License

MIT

## MCP Inspector Compatibility

When using this server with the MCP Inspector, note that all logging is done via the MCP logging capability instead of `console.log()`. This is intentional and necessary for compatibility with the MCP protocol, which uses stdout for JSON communication.

If you're extending this server or debugging issues:

1. Use the event-based logging system by emitting LOG_EVENT events
2. Avoid using `console.log()` as it will interfere with the MCP protocol's JSON messages on stdout
3. For debugging outside the MCP context, you can use `console.error()` which outputs to stderr

## Event-Based Logging Architecture

The server uses an event-based logging architecture:

1. **Event Emitters**: All tool and resource classes extend Node.js's `EventEmitter` and emit 'log' events with level and message data.

2. **Log Forwarding**: These events are captured by event listeners and forwarded to the MCP server's logging system:

   ```javascript
   // Set up event listeners for tool logs
   startPaymentCaptureTool.on(LOG_EVENT, logToMcp);
   captureCardNumberTool.on(LOG_EVENT, logToMcp);
   // ... other tools
   ```

3. **MCP Integration**: The `logToMcp` function transforms these events into MCP-compatible log messages:

   ```javascript
   const logToMcp = (data: { level: string, message: string }) => {
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

## Payment Callback Data Structure

The server processes two main types of callback data from Twilio:

### Initial Connector Data

When a payment session is first created, Twilio sends connector data:

```json
{
  "PaymentConnector": "PGP_MOCK",
  "DateCreated": "2021-08-10T03:55:53.408Z",
  "PaymentMethod": "credit-card",
  "CallSid": "CAzzzzz",
  "ChargeAmount": "9.99",
  "AccountSid": "ACxxxxx",
  "Sid": "PKxxxx"
}
```



### Capture Data

As payment information is captured, Twilio sends updated data:

```json
{ 
  "SecurityCode": "xxx",
  "PaymentCardType": "visa",
  "Sid": "PKxxxx",
  "PaymentConfirmationCode": "ch_a9dc6297cd1a4fb095e61b1a9cf2dd1d",
  "CallSid": "CAxxxxx",
  "Result": "success",
  "AccountSid": "AC75xxxxxx",
  "ProfileId": "",
  "DateUpdated": "2021-08-10T03:58:27.290Z",
  "PaymentToken": "",
  "PaymentMethod": "credit-card",
  "PaymentCardNumber": "xxxxxxxxxxxx1111",
  "ExpirationDate": "1225"
}
```

The server stores this data in the statusCallbackMap, indexed by the payment SID, and makes it available through the PaymentStatusResource.
