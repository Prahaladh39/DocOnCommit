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

Installation (Development / Demo)

DocSync is currently configured for development and demonstration purposes.

At the moment:

The GitHub App backend runs locally

Webhooks are exposed using ngrok

The app is not deployed to a public server yet

🔹 How it is used right now

The app is installed only by the developer (owner) on selected test repositories

GitHub sends webhook events to the locally running server

All functionality (diff analysis, docstring generation, PR comments) works end-to-end

🔹 Production note

In a production setup:

The webhook server would be deployed to a cloud platform (e.g., Railway, Render)

The GitHub App webhook URL would be updated once

End users would simply install the app from its GitHub App page — no setup required

This project focuses on core automation logic, reliability, and AI-driven workflows, rather than deployment.
