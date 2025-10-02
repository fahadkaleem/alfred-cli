#!/bin/bash
# Script to remove all remaining sandbox references from Alfred CLI

echo "Removing sandbox references from test files..."

# Remove SANDBOX env var tests from prompts.test.ts
sed -i.bak '/should include sandbox-specific instructions/,/^  });/d' packages/core/src/core/prompts.test.ts
sed -i.bak '/should include seatbelt-specific instructions/,/^  });/d' packages/core/src/core/prompts.test.ts
sed -i.bak '/should include non-sandbox instructions/,/^  });/d' packages/core/src/core/prompts.test.ts

# Remove sandbox from editor tests
sed -i.bak "s/vi.stubEnv('SANDBOX'[^)]*)[;,]/\/\/ Sandbox removed/g" packages/core/src/utils/editor.test.ts
sed -i.bak '/should.*sandbox mode/,/^    });/d' packages/core/src/utils/editor.test.ts

# Remove sandbox from editCorrector test
sed -i.bak '/sandbox:/d' packages/core/src/utils/editCorrector.test.ts
sed -i.bak '/getSandbox:/d' packages/core/src/utils/editCorrector.test.ts

# Remove sandbox_enabled from telemetry tests
sed -i.bak '/sandbox_enabled:/d' packages/core/src/telemetry/loggers.test.ts

# Clean up backup files
find packages -name "*.bak" -delete

echo "Done removing sandbox test references"
