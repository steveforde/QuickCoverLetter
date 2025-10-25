#!/bin/bash
echo "🔄 Restoring VS Code setup..."
cat vscode-extensions.txt | xargs -L 1 code --install-extension
cp -R .vscode ~/Library/Application\ Support/Code/User/
echo "✅ VS Code setup restored successfully!"

