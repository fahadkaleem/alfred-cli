# Ignoring Files

This document provides an overview of the Gemini Ignore (`.alfredignore`) feature of the Alfred CLI.

The Alfred CLI includes the ability to automatically ignore files, similar to `.gitignore` (used by Git) and `.aiexclude` (used by Gemini Code Assist). Adding paths to your `.alfredignore` file will exclude them from tools that support this feature, although they will still be visible to other services (such as Git).

## How it works

When you add a path to your `.alfredignore` file, tools that respect this file will exclude matching files and directories from their operations. For example, when you use the [`read_many_files`](./tools/multi-file.md) command, any paths in your `.alfredignore` file will be automatically excluded.

For the most part, `.alfredignore` follows the conventions of `.gitignore` files:

- Blank lines and lines starting with `#` are ignored.
- Standard glob patterns are supported (such as `*`, `?`, and `[]`).
- Putting a `/` at the end will only match directories.
- Putting a `/` at the beginning anchors the path relative to the `.alfredignore` file.
- `!` negates a pattern.

You can update your `.alfredignore` file at any time. To apply the changes, you must restart your Alfred CLI session.

## How to use `.alfredignore`

To enable `.alfredignore`:

1. Create a file named `.alfredignore` in the root of your project directory.

To add a file or directory to `.alfredignore`:

1. Open your `.alfredignore` file.
2. Add the path or file you want to ignore, for example: `/archive/` or `apikeys.txt`.

### `.alfredignore` examples

You can use `.alfredignore` to ignore directories and files:

```
# Exclude your /packages/ directory and all subdirectories
/packages/

# Exclude your apikeys.txt file
apikeys.txt
```

You can use wildcards in your `.alfredignore` file with `*`:

```
# Exclude all .md files
*.md
```

Finally, you can exclude files and directories from exclusion with `!`:

```
# Exclude all .md files except README.md
*.md
!README.md
```

To remove paths from your `.alfredignore` file, delete the relevant lines.
