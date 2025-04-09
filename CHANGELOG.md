# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-04-09

### Added
- Initial implementation of Twilio Agent Assisted Payment MCP Server
- Payment capture workflow with step-by-step prompts
- Tools for capturing card information:
  - `StartPaymentCaptureTool` - Initiates the payment capture process
  - `CaptureCardNumberTool` - Securely captures credit card numbers
  - `CaptureExpirationDateTool` - Captures card expiration dates
  - `CaptureSecurityCodeTool` - Captures CVV/security codes
  - `CompletePaymentCaptureTool` - Finalizes the payment capture process
- Payment status resource for tracking payment state
- Integration with Twilio API for secure payment processing
- Event-based architecture for payment flow management
- Express API server for handling payment requests
- Integration with MCP SDK v1.7.0
- Status callback functionality via @deshartman/mcp-status-callback

### Changed
- Updated dependencies to latest versions
- Improved TypeScript configuration for better type safety

### Fixed
- Initial bug fixes and stability improvements

## [0.1.0] - 2025-03-15

### Added
- Project scaffolding and initial setup
- Basic MCP server implementation
- Configuration for TypeScript and Node.js
