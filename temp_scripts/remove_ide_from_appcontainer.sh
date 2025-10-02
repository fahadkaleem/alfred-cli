#!/bin/bash

FILE="/Users/mohammedfahadkaleem/Documents/Workspace/alfred-cli/packages/cli/src/ui/AppContainer.tsx"

# Remove IDE prompt state
sed -i.bak '/const \[idePromptAnswered, setIdePromptAnswered\]/d' "$FILE"
sed -i.bak '/const \[currentIDE, setCurrentIDE\]/d' "$FILE"

# Remove IDE useEffect
sed -i.bak '/useEffect(() => {/,/getIde();/{ /const getIde = async/,/};/d; }' "$FILE"

# Remove shouldShowIdePrompt
sed -i.bak '/const shouldShowIdePrompt/,/);$/d' "$FILE"

# Remove IDE context state
sed -i.bak '/const \[ideContextState, setIdeContextState\]/,/);$/d' "$FILE"

# Remove IDE restart prompt state
sed -i.bak '/const \[showIdeRestartPrompt, setShowIdeRestartPrompt\]/d' "$FILE"

# Remove useIdeTrustListener hook
sed -i.bak '/const {/,/} = useIdeTrustListener();/{ /needsRestart: ideNeedsRestart/,/} = useIdeTrustListener();/d; }' "$FILE"

# Remove IDE restart effect
sed -i.bak '/useEffect(() => {/,/}, \[ideNeedsRestart\]);/{ /if (ideNeedsRestart)/,/}, \[ideNeedsRestart\]);/d; }' "$FILE"

# Remove IDE context store subscription
sed -i.bak '/const unsubscribe = ideContextStore.subscribe/,/setIdeContextState(ideContextStore.get());/d' "$FILE"

# Remove handleIdePromptComplete
sed -i.bak '/const handleIdePromptComplete/,/\[config, settings\],$/d' "$FILE"
sed -i.bak '/);$/d' "$FILE"

echo "IDE references removed from AppContainer.tsx"
