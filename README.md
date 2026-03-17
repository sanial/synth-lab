Link: https://synth-lab-203573749453.us-central1.run.app./

## Inspiration
Don't just read research—watch it think. Most AI summaries are just walls of text that lose the complex architecture of a research paper. Synth Lab is a multimodal "Live Notebook" that doesn't just explain research papers; it architecturally reconstructs them. As the agent analysis methodology of one or more arXiv papers, it simultaneously "draws" the logic in real-time using interleaved D3.js concept maps and Mermaid diagrams.

## What it does
Synth Lab is an AI-powered research architect that transforms the static text of arXiv papers into "living" structural models. Instead of simply summarizing, Synth Lab performs a Technical Synthesis: it deconstructs a paper's core methodology and reconstructs it as a progressively rendered, hierarchical diagram.

The application operates in 4 tabs:

- Technical Synthesis: 1 or more research papers are technically synthesized into a mermaid.js Flow Mode chart and a Final Chart. It provides a master architectural diagram that consolidates the entire paper into a high-level system overview, suitable for research planning and experiment design. The Flow Mode (The Breakdown) specifically uses Mermaid.js to generate evolving flowcharts that allow users to visually "unpack" complex research steps. Users can trigger "Sub-diagrams" to drill deeper into specific technical modules.
- Research Agent: Provides Further textual analysis and subgraphs for the users topic understanding
- Deep Dive: A multimodal view that interleaves D3.js lexical "Bubble Maps"providing a meta-analysis of the paper’s weight—quantifying word density and thematic importance visually.
- Conceptual Dive: Interleaved Charts rendered by an agent breaking down concepts in multiple research papers and giving a topic by topic analysis. 


## How we built it
We built a high-concurrency pipeline using the TypeScript Gemini ADK and Gemini 2.5 Flash.

The Orchestrator: A Node.js backend hosted on Google Cloud Run that manages the stream between the arXiv API and the Gemini model.

Technical Synthesis Engine: We developed a custom "Anchor" system. As Gemini parses the paper, it identifies specific technical "nodes" and immediately emits Function Tool calls to trigger visual updates.

The Interface: A React dashboard designed for "Interleaved Media." The UI doesn't wait for a full response; it listens for partial Mermaid and D3 payloads, rendering the logic structure as it is "thought" by the model.

## Challenges we ran into
The primary challenge is the Pipeline Latency especially in the Conceptual dive tab. Generating a full technical synthesis of a 30-page paper requires significant token processing. Currently, the generation speed for complex diagrams remains slower than desired. I am working on optimizing the streaming capabilities—specifically, moving from "block-rendering" to "character-streaming" for the Mermaid code so the user sees the graph "sketching" itself node-by-node rather than waiting for valid syntax blocks.

## Accomplishments that we're proud of
- Architectural Interleaving: Successfully synchronized the text explanation with the diagram updates, ensuring the "Reasoning" and the "Visual" are never out of phase.
- Sub-diagram Recursion: Being able to take one node of a generated chart and "break it down further" into its own sub-synthesis.
- GCP Hosting: Ran into build issues but successfully fixed them

## What we learned
We learned that visual reasoning is a distinct skill from text generation. Training an agent to output valid and readable Mermaid.js syntax while maintaining a technical narrative requires strict system-instruction design. We also gained deep insight into managing long-lived server-sent events (SSE) on Google Cloud.

## What's next for Synth Lab
- Granular Streaming: Implementing a custom Mermaid parser that can handle broken/partial syntax strings to provide a true "no-wait" visual experience.

- Cross-Paper Comparative Maps: Allowing the agent to synthesize multiple papers into a single "State of the Art" (SOTA) comparison diagram.

- D3 Interaction: Making the D3 Lexical Bubbles interactive, allowing users to click a word to see its direct context within the original PDF.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Google Cloud (Cloud Run)

### 1) Prerequisites
- Install Google Cloud CLI and login:
   `gcloud auth login`
- Select your project:
   `gcloud config set project YOUR_PROJECT_ID`
- Enable required services:
   `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com`

### 2) Deploy from source
From the project root, run:

`gcloud run deploy synthesis-lab --source . --region us-central1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY`

### 3) Update env var later (optional)
`gcloud run services update synthesis-lab --region us-central1 --update-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY`

### 4) Open the app
`gcloud run services describe synthesis-lab --region us-central1 --format='value(status.url)'`

Notes:
- The server is configured to use Cloud Run `PORT` automatically.
- SPA routes are served correctly in production via `index.html` fallback.

## GitHub Actions Auto-Deploy (main branch)

This repo now includes [deploy-cloud-run.yml](.github/workflows/deploy-cloud-run.yml).

Add these GitHub repository secrets before using it:
- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GEMINI_API_KEY`

Then push to `main` (or run the workflow manually from the Actions tab) to deploy automatically.
