# Alfred CLI

Within Alfred CLI, `packages/cli` is the frontend for users to send and receive prompts with the Gemini AI model and its associated tools. For a general overview of Alfred CLI, see the [main documentation page](../index.md).

## Navigating this section

- **[Authentication](./authentication.md):** A guide to setting up authentication with Google's AI services.
- **[Commands](./commands.md):** A reference for Alfred CLI commands (e.g., `/help`, `/tools`, `/theme`).
- **[Configuration](./configuration.md):** A guide to tailoring Alfred CLI behavior using configuration files.
- **[Enterprise](./enterprise.md):** A guide to enterprise configuration.
- **[Headless Mode](../headless.md):** A comprehensive guide to using Alfred CLI programmatically for scripting and automation.
- **[Token Caching](./token-caching.md):** Optimize API costs through token caching.
- **[Themes](./themes.md)**: A guide to customizing the CLI's appearance with different themes.
- **[Tutorials](tutorials.md)**: A tutorial showing how to use Alfred CLI to automate a development task.

## Non-interactive mode

Alfred CLI can be run in a non-interactive mode, which is useful for scripting and automation. In this mode, you pipe input to the CLI, it executes the command, and then it exits.

The following example pipes a command to Alfred CLI from your terminal:

```bash
echo "What is fine tuning?" | gemini
```

You can also use the `--prompt` or `-p` flag:

```bash
gemini -p "What is fine tuning?"
```

For comprehensive documentation on headless usage, scripting, automation, and advanced examples, see the **[Headless Mode](../headless.md)** guide.
