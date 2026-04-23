### Links:
- Live Demo: https://synth-lab-203573749453.us-central1.run.app./
- Video Link: https://youtu.be/_lGVlJ6S7NQ
- Page: https://sanial.github.io/proj_synth_lab.html

<img width="3240" height="1804" alt="Screenshot 2026-03-16 190726" src="https://github.com/user-attachments/assets/840c3e58-5c82-491e-a5aa-30e479fecaae" />
<img width="3240" height="1810" alt="Screenshot 2026-03-16 190748" src="https://github.com/user-attachments/assets/289cbefd-464c-4692-b59b-b5f83a0da742" />
<img width="3236" height="1812" alt="Screenshot 2026-03-16 190807" src="https://github.com/user-attachments/assets/b39f8ebb-35b0-4b89-b5d0-ff2684316d00" />
<img width="3240" height="1814" alt="Screenshot 2026-03-16 190846" src="https://github.com/user-attachments/assets/7990e1b6-1f6a-4886-ba16-312bc2da59fe" />
<img width="3172" height="1798" alt="Screenshot 2026-03-17 174811" src="https://github.com/user-attachments/assets/28c90f1a-ab77-460d-aa22-485d3d775d92" />
<img width="3240" height="3218" alt="synth-lab4 (1)" src="https://github.com/user-attachments/assets/e302cb18-b9ee-4ad2-8369-6db5c9d52407" />
<img width="3240" height="2868" alt="synth-lab4 (4)" src="https://github.com/user-attachments/assets/74900048-4b54-438e-aaff-a0548f78e920" />
<img width="3240" height="1812" alt="synth-lab4 (3)" src="https://github.com/user-attachments/assets/d2bf20c9-8247-4358-822f-5114f3163538" />
<img width="3240" height="9073" alt="synth-lab4 (2)" src="https://github.com/user-attachments/assets/37c995db-4fb3-4853-93f2-622a5b33e135" />
<img width="3240" height="1804" alt="synth-lab4 (0)" src="https://github.com/user-attachments/assets/d7296751-5d9c-4855-a66c-431d79852f86" />
<img width="3204" height="1698" alt="synth-lab5" src="https://github.com/user-attachments/assets/9c2c01c8-07b7-4957-ab7e-d7bafb1bd941" />

A full-stack TypeScript application that transforms arXiv research papers into interactive visual artifacts. Instead of producing text summaries, Synth Lab turns paper content into architecture diagrams, keyword maps, and cross-paper conceptual comparisons.
Built as a solo entry for the Google Gemini Agent Competition in 10 days.

## Problem 
Academic research papers are dense and static. Most AI tools summarize them as walls of text that lose the underlying architecture and methodology structure. Readers end up manually tracing through complex systems buried in prose, spending hours building mental models that an AI could generate in seconds.

## Architecture
The backend is an intentionally thin Express server hosted on Google Cloud Run. It acts as a secure gateway between the frontend and external services, keeping the Gemini API key off the client, proxying arXiv searches and PDF fetches, and shaping prompts before sending them to Gemini. The frontend is a React and Vite application that owns all user orchestration, session state, and rendering.
The core data flow is: arXiv search → backend normalizes the Atom feed into paper objects → selected papers sent to Gemini for analysis → structured JSON returned → React renders across four tabs.
The backend makes three distinct Gemini calls. Conceptual Dive runs a two-pass pipeline where the first call analyzes paper content and the second converts that analysis into Mermaid diagram JSON. Audio narration for the Research Agent tab is handled by a separate Gemini TTS call.


## The Four Tabs
Technical Synthesis turns one or more papers into a Mermaid flowchart and a final architecture diagram. Users can trigger sub-diagrams to drill deeper into specific technical modules.
Research Agent provides deeper written analysis of the paper with optional audio narration.
Deep Dive parses the paper PDF with pdf.js and builds a D3 bubble map from keyword frequency, giving a visual sense of thematic weight across the document.
Conceptual Dive runs the two-pass Gemini pipeline across multiple papers and renders cross-paper comparative diagrams.

## Known Limitations
Conceptual Dive is slow because Gemini analyzes paper content and generates diagrams in the same sequential pipeline. Splitting these into separate cached stages would fix this.
PDF fetches are never cached. Every request re-downloads the same files from arXiv. A persistent storage layer would eliminate this on repeat requests.
Mermaid diagram generation breaks on complex papers with no retry or fallback logic. Syntax errors surface directly to the user. Schema enforcement and a fallback rendering path would fix this.
The streaming UI is simulated. The backend returns a full Gemini response and the client incrementally renders it. Real server-sent event streaming is the next step.

## What's Next
Splitting the Conceptual Dive pipeline into cached stages to reduce latency. Adding a persistent database so users can save and return to diagrams and searches across sessions. Implementing real SSE streaming from Gemini through the backend. Adding structured output validation for Mermaid generation with fallback parsing.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

4. Run the app:
   `npm run dev`

<img width="2218" height="1786" alt="Screenshot 2026-03-16 195825" src="https://github.com/user-attachments/assets/3478c740-7fee-429d-bad6-0e6035194858" />


## GCloud Proof videos
https://github.com/user-attachments/assets/e1352277-25a7-4407-aadf-a30fad279346
https://github.com/user-attachments/assets/48034d6a-b350-4b38-ae0b-8d2d787608c1


