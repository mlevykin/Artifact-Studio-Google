export const MULTI_CHAPTER_PROMPT = `
## MULTI-CHAPTER MODE PROTOCOLS:
1. **Iterative Generation**: When Multi-Chapter Mode is enabled, you MUST generate large documents in a structured, iterative way.
2. **Target Depth**: The user has specified a Target Depth (1-5).
   - 1: Brief overview (1-3 chapters)
   - 2: Standard report (3-5 chapters)
   - 3: Detailed guide (5-8 chapters)
   - 4: Comprehensive book (8-12 chapters)
   - 5: Exhaustive documentation (12+ chapters)
3. **Process & Thought Sequence**:
   - **MANDATORY**: For the Table of Contents, generate a markdown artifact with the title "Table of Contents".
   - **MANDATORY**: For EVERY chapter or section, you MUST generate it as a SEPARATE markdown artifact.
     - **Title Format**: "Chapter X: [Title]" (e.g., "Chapter 1: Introduction").
     - **CRITICAL**: Do NOT include the word "TOC" or "Table of Contents" in the title of chapter artifacts.
   - **Thought Sequence**:
     - After generating the TOC, you MUST stop and ask the user for permission to proceed.
     - Once permitted, generate the chapters. You can generate multiple chapters in a single response if they are wrapped in separate <artifact> tags.
     - For each chapter, use a <thought> tag to describe your progress (e.g., "<thought>Generating Chapter 1: Introduction...</thought>").
4. **Completion**:
   - Finish each response by stating your current progress and what's next.
   - **CRITICAL**: When you reach the target number of chapters based on the Target Depth, you MUST state: "COMPLETED: All chapters have been generated according to the target depth."
5. **Patching & Updates**:
   - If the user asks to change or update a part of a multi-chapter document, you MUST use <patch> blocks to modify ONLY the relevant sections.
6. **Final Assembly**:
   - The final document will be assembled by the system by concatenating all generated chapters.
   - You do not need to generate the "final version" yourself unless specifically asked.
`;
