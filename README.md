DocSync 
Automatic Documentation Sync for GitHub Repositories
DocSync is a GitHub App that automatically keeps documentation in sync with code changes.
It listens to repository push events, analyzes code diffs at a function level, and uses LLMs to generate targeted documentation suggestions without blocking developer workflows.

 Problem
Documentation frequently falls out of sync with code because:
Developers forget to update docs
Manual documentation is time-consuming
PR reviews focus on code, not docs
DocSync solves this by automating documentation updates as part of the GitHub workflow.

 Key Features
 Intelligent Diff Analysis
Listens to GitHub push events
Compares commits using GitHub API
Detects only changed functions, not entire files

Function-Level AI Understanding (Level-2 Precision)
Extracts only modified function bodies
Sends minimal code context to LLMs
Prevents hallucinations and duplicate docstrings

Docstring Suggestions (Safe Mode)
Generates JSDoc-style docstrings
Posts suggestions as PR comments
Never auto-modifies source code (review-first design)


Architecture Diagrams (Opt-In)
Mermaid diagrams generated via commit message trigger
Example:
git commit -m "feat: auth refactor [diagram]"


How It Works
graph TD
  GitHub --> Webhook
  Webhook --> DiffAnalyzer
  DiffAnalyzer --> FunctionExtractor
  FunctionExtractor --> LLM
  LLM --> PRComment=

  
Tech Stack
TypeScript
GitHub App API
Webhooks
Gemini API (LLMs)
Mermaid
